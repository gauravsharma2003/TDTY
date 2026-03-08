const fs = require("fs");
const path = require("path");

const EVENTS_FILE = path.join(__dirname, "..", "events.json");
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function checkUrl(url, timeoutMs = 10000) {
  if (!url) return 0;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      headers: { "User-Agent": "TDTY-App/1.0 (image-check)" },
      redirect: "follow",
    });
    clearTimeout(timer);
    return res.status;
  } catch {
    clearTimeout(timer);
    return 0;
  }
}

async function fetchJSON(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "TDTY-App/1.0 (image-fix)" },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) return await res.json();
    return null;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

function extractFilename(url) {
  if (!url) return "";
  return decodeURIComponent(url.split("/").pop() || "");
}

// Try alternate sizes for a Wikimedia thumbnail URL
function getAlternateUrls(url) {
  if (!url) return [];
  const alts = [];

  // If it's an 800px URL, try 640px, 480px, 330px
  if (url.includes("/800px-")) {
    alts.push(url.replace("/800px-", "/640px-"));
    alts.push(url.replace("/800px-", "/480px-"));
    alts.push(url.replace("/800px-", "/330px-"));
  }

  // If it's a 1280px URL, try 800px, 640px
  if (url.includes("/1280px-")) {
    alts.push(url.replace("/1280px-", "/800px-"));
    alts.push(url.replace("/1280px-", "/640px-"));
    alts.push(url.replace("/1280px-", "/330px-"));
  }

  // Try the full-size image (remove /thumb/ and the size part)
  const thumbMatch = url.match(/\/thumb\/(.+?)\/\d+px-/);
  if (thumbMatch) {
    const fullUrl = url.replace("/thumb/", "/").replace(/\/\d+px-[^/]+$/, "");
    alts.push(fullUrl);
  }

  return alts;
}

// Fetch a fresh image from Wikipedia page summary
async function fetchFreshImage(title) {
  if (!title) return null;
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const summary = await fetchJSON(url);
  if (summary?.thumbnail?.source) {
    return summary.thumbnail.source;
  }
  if (summary?.originalimage?.source) {
    return summary.originalimage.source;
  }
  return null;
}

// Search Wikimedia Commons for an image related to the event
async function searchWikimediaImage(query) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srnamespace=6&srlimit=3&format=json`;
  const data = await fetchJSON(url);
  if (!data?.query?.search?.length) return null;

  for (const result of data.query.search) {
    const title = result.title; // e.g., "File:Something.jpg"
    const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|mime&format=json`;
    const infoData = await fetchJSON(infoUrl);
    if (!infoData?.query?.pages) continue;

    for (const page of Object.values(infoData.query.pages)) {
      const info = page.imageinfo?.[0];
      if (info?.url && info.mime?.startsWith("image/")) {
        return info.url;
      }
    }
  }
  return null;
}

async function main() {
  const events = JSON.parse(fs.readFileSync(EVENTS_FILE, "utf-8"));

  // Flatten all events
  const allEvents = [];
  for (const [key, dayEvents] of Object.entries(events)) {
    for (let i = 0; i < dayEvents.length; i++) {
      allEvents.push({ key, index: i, event: dayEvents[i] });
    }
  }

  console.log(`Checking ${allEvents.length} images...\n`);

  // Check all images with rate limiting (3 concurrent, 100ms delay)
  const broken = [];
  let checked = 0;
  let good = 0;
  let bad = 0;
  let empty = 0;

  // Process in batches of 3
  for (let batch = 0; batch < allEvents.length; batch += 3) {
    const batchItems = allEvents.slice(batch, batch + 3);
    const results = await Promise.all(
      batchItems.map(async (item) => {
        if (!item.event.image_url) {
          return { ...item, status: 0, empty: true };
        }
        const status = await checkUrl(item.event.image_url);
        return { ...item, status };
      })
    );

    for (const r of results) {
      checked++;
      if (r.empty) {
        empty++;
        broken.push(r);
      } else if (r.status === 200) {
        good++;
      } else {
        bad++;
        broken.push(r);
      }
    }

    if (checked % 150 === 0 || checked === allEvents.length) {
      console.log(`Checked: ${checked}/${allEvents.length} | OK: ${good} | Broken: ${bad} | Empty: ${empty}`);
    }

    await delay(100);
  }

  console.log(`\nTotal broken/empty: ${broken.length}`);

  if (broken.length === 0) {
    console.log("All images are valid!");
    return;
  }

  // Fix broken images
  console.log(`\nFixing ${broken.length} broken images...\n`);
  let fixed = 0;
  let unfixable = 0;

  for (let i = 0; i < broken.length; i++) {
    const { key, index, event, status } = broken[i];
    let newUrl = null;

    // Step 1: Try alternate sizes
    if (event.image_url) {
      const alts = getAlternateUrls(event.image_url);
      for (const alt of alts) {
        const altStatus = await checkUrl(alt);
        if (altStatus === 200) {
          newUrl = alt;
          break;
        }
        await delay(100);
      }
    }

    // Step 2: Fetch fresh image from Wikipedia page summary
    if (!newUrl && event.title) {
      await delay(150);
      const freshUrl = await fetchFreshImage(event.title);
      if (freshUrl) {
        const freshStatus = await checkUrl(freshUrl);
        if (freshStatus === 200) {
          newUrl = freshUrl;
        }
      }
    }

    // Step 3: Search Wikimedia Commons
    if (!newUrl) {
      await delay(150);
      const searchQuery = event.title + " " + event.year;
      const searchUrl = await searchWikimediaImage(searchQuery);
      if (searchUrl) {
        const searchStatus = await checkUrl(searchUrl);
        if (searchStatus === 200) {
          newUrl = searchUrl;
        }
      }
    }

    if (newUrl) {
      events[key][index].image_url = newUrl;
      events[key][index].image_filename = extractFilename(newUrl);
      events[key][index].image_credit = extractFilename(newUrl) + " - Wikimedia Commons";
      fixed++;
    } else {
      unfixable++;
    }

    if ((i + 1) % 20 === 0 || i === broken.length - 1) {
      console.log(`Fix progress: ${i + 1}/${broken.length} | Fixed: ${fixed} | Unfixable: ${unfixable}`);
    }
  }

  // Remove events with no working image
  if (unfixable > 0) {
    let removed = 0;
    for (const key of Object.keys(events)) {
      const before = events[key].length;
      events[key] = events[key].filter((e) => e.image_url);
      removed += before - events[key].length;
    }
    if (removed > 0) console.log(`Removed ${removed} events with no image`);
  }

  fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));
  const total = Object.values(events).reduce((s, a) => s + a.length, 0);
  console.log(`\nSaved! ${total} events total. Fixed: ${fixed}, Unfixable: ${unfixable}`);
  console.log("Run: npm run split-data");
}

main().catch(console.error);
