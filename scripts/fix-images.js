const fs = require("fs");
const path = require("path");

const EVENTS_FILE = path.join(__dirname, "..", "events.json");
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJSON(url, timeoutMs = 15000) {
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

function extractUrlFilename(url) {
  if (!url) return "";
  return decodeURIComponent(url.split("/").pop() || "");
}

// Normalize filename for consistent matching (API normalizes underscores to spaces)
function normalizeFilename(f) {
  return f.replace(/_/g, " ");
}

// Extract the original Wikimedia filename from any URL format
function extractCommonsFilename(url) {
  if (!url) return null;

  let u = url.replace("/thumb/thumb/", "/thumb/");

  // Thumb URL: .../thumb/{a}/{ab}/{filename}/{size}px-...
  const thumbMatch = u.match(/\/(?:commons|en)\/thumb\/[0-9a-f]\/[0-9a-f]{2}\/([^/]+)\//);
  if (thumbMatch) return decodeURIComponent(thumbMatch[1]);

  // Direct URL: .../commons/{a}/{ab}/{filename}
  const directMatch = u.match(/\/(?:commons|en)\/[0-9a-f]\/[0-9a-f]{2}\/([^/]+)$/);
  if (directMatch) return decodeURIComponent(directMatch[1]);

  return null;
}

// Batch query Wikimedia API for correct thumbnail URLs
// Returns Map<normalizedFilename, thumbUrl>
async function batchGetThumbnails(filenames, apiBase, width = 1280) {
  const results = new Map();
  if (filenames.length === 0) return results;

  const titles = filenames.map((f) => "File:" + f).join("|");
  const apiUrl = `${apiBase}/w/api.php?action=query&titles=${encodeURIComponent(titles)}&prop=imageinfo&iiprop=url&iiurlwidth=${width}&format=json`;

  const data = await fetchJSON(apiUrl);
  if (!data?.query?.pages) return results;

  // Build normalization map: from -> to
  const normMap = {};
  if (data.query.normalized) {
    for (const n of data.query.normalized) {
      normMap[n.to] = n.from;
    }
  }

  for (const page of Object.values(data.query.pages)) {
    if (!page.imageinfo?.[0]) continue;
    const info = page.imageinfo[0];
    const apiTitle = page.title.replace(/^File:/, "");

    // Store by normalized name (spaces) for consistent lookup
    const key = normalizeFilename(apiTitle);
    results.set(key, info.thumburl || info.url);
  }

  return results;
}

async function main() {
  // Re-read the ORIGINAL events file (before any bad fixes from killed scripts)
  const events = JSON.parse(fs.readFileSync(EVENTS_FILE, "utf-8"));

  // Collect all unique filenames, grouped by source (commons vs en.wiki)
  const commonsFiles = new Map(); // normalizedName -> [{ key, index }]
  const enFiles = new Map();
  let directUrls = 0;
  let noFile = 0;

  for (const [key, dayEvents] of Object.entries(events)) {
    for (let i = 0; i < dayEvents.length; i++) {
      const url = dayEvents[i].image_url;
      if (!url) { noFile++; continue; }
      if (!url.includes("/thumb/")) { directUrls++; continue; }

      const filename = extractCommonsFilename(url);
      if (!filename) { noFile++; continue; }

      const normName = normalizeFilename(filename);
      const isEn = url.includes("/wikipedia/en/");
      const map = isEn ? enFiles : commonsFiles;

      if (!map.has(normName)) map.set(normName, []);
      map.get(normName).push({ key, index: i, origFilename: filename });
    }
  }

  console.log(`URLs: ${directUrls} direct, ${commonsFiles.size} unique commons thumbs, ${enFiles.size} unique en thumbs, ${noFile} no-file`);

  // Batch query Commons API
  const allCommonsNames = [...commonsFiles.keys()];
  const commonsUrlMap = new Map();
  console.log(`\nQuerying Commons API for ${allCommonsNames.length} files...`);

  for (let batch = 0; batch < allCommonsNames.length; batch += 50) {
    // Use ORIGINAL filenames (with underscores) for the query
    const batchNormNames = allCommonsNames.slice(batch, batch + 50);
    const batchOrigNames = batchNormNames.map((n) => {
      const items = commonsFiles.get(n);
      return items[0].origFilename;
    });

    const result = await batchGetThumbnails(batchOrigNames, "https://commons.wikimedia.org");
    for (const [normName, thumbUrl] of result) {
      commonsUrlMap.set(normName, thumbUrl);
    }

    const done = Math.min(batch + 50, allCommonsNames.length);
    if (done % 200 === 0 || done === allCommonsNames.length) {
      console.log(`  ${done}/${allCommonsNames.length} queried, ${commonsUrlMap.size} found`);
    }
    await delay(300);
  }

  // Batch query en.wikipedia API
  const allEnNames = [...enFiles.keys()];
  const enUrlMap = new Map();
  if (allEnNames.length > 0) {
    console.log(`\nQuerying en.wiki API for ${allEnNames.length} files...`);
    for (let batch = 0; batch < allEnNames.length; batch += 50) {
      const batchNormNames = allEnNames.slice(batch, batch + 50);
      const batchOrigNames = batchNormNames.map((n) => {
        const items = enFiles.get(n);
        return items[0].origFilename;
      });

      const result = await batchGetThumbnails(batchOrigNames, "https://en.wikipedia.org");
      for (const [normName, thumbUrl] of result) {
        enUrlMap.set(normName, thumbUrl);
      }
      await delay(300);
    }
    console.log(`  Found: ${enUrlMap.size}`);
  }

  // Apply correct URLs
  let fixed = 0;
  let unchanged = 0;
  let missing = 0;
  const missingItems = [];

  for (const [normName, items] of commonsFiles) {
    const correctUrl = commonsUrlMap.get(normName);
    if (!correctUrl) {
      missing += items.length;
      missingItems.push(...items);
      continue;
    }
    for (const { key, index } of items) {
      const ev = events[key][index];
      if (ev.image_url !== correctUrl) {
        ev.image_url = correctUrl;
        ev.image_filename = extractUrlFilename(correctUrl);
        ev.image_credit = extractUrlFilename(correctUrl) + " - Wikimedia Commons";
        fixed++;
      } else {
        unchanged++;
      }
    }
  }

  for (const [normName, items] of enFiles) {
    const correctUrl = enUrlMap.get(normName);
    if (!correctUrl) {
      missing += items.length;
      missingItems.push(...items);
      continue;
    }
    for (const { key, index } of items) {
      const ev = events[key][index];
      if (ev.image_url !== correctUrl) {
        ev.image_url = correctUrl;
        ev.image_filename = extractUrlFilename(correctUrl);
        ev.image_credit = extractUrlFilename(correctUrl) + " - Wikimedia Commons";
        fixed++;
      } else {
        unchanged++;
      }
    }
  }

  console.log(`\nResults: ${fixed} fixed, ${unchanged} unchanged, ${missing} not found in API`);

  // For missing items, try Wikipedia page summary as fallback
  if (missingItems.length > 0 && missingItems.length < 200) {
    console.log(`\nFetching replacements for ${missingItems.length} missing via Wikipedia...`);
    let refetched = 0;
    for (const item of missingItems) {
      const ev = events[item.key][item.index];
      const title = ev.title.replace(/\s+/g, "_");
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
      const summary = await fetchJSON(url);
      if (summary?.thumbnail?.source) {
        ev.image_url = summary.thumbnail.source;
        ev.image_filename = extractUrlFilename(summary.thumbnail.source);
        ev.image_credit = extractUrlFilename(summary.thumbnail.source) + " - Wikimedia Commons";
        refetched++;
      } else {
        ev.image_url = "";
      }
      await delay(200);
    }
    console.log(`  Refetched: ${refetched}/${missingItems.length}`);
  }

  // Remove events with no image
  let removed = 0;
  for (const key of Object.keys(events)) {
    const before = events[key].length;
    events[key] = events[key].filter((e) => e.image_url);
    removed += before - events[key].length;
  }
  if (removed > 0) console.log(`Removed ${removed} events with no image`);

  fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));
  const total = Object.values(events).reduce((s, a) => s + a.length, 0);
  console.log(`\nSaved! ${total} total events`);

  // Verify Jan 2
  console.log("\nVerifying Jan 2 images (1s delay between checks)...");
  const jan2 = events["01-02"];
  for (const ev of jan2.slice(0, 6)) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(ev.image_url, {
        method: "HEAD",
        signal: controller.signal,
        headers: { "User-Agent": "TDTY/1.0" },
      });
      clearTimeout(timer);
      console.log(`  ${res.status} | ${ev.year} | ${ev.title}`);
    } catch {
      console.log(`  ERR | ${ev.year} | ${ev.title}`);
    }
    await delay(1200);
  }

  console.log("\nDone! Run: npm run split-data");
}

main().catch(console.error);
