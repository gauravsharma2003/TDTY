const fs = require("fs");
const path = require("path");

const EVENTS_FILE = path.join(__dirname, "..", "events.json");
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// Valid Wikimedia thumbnail widths (based on their step policy)
// 800px is NOT valid. 330, 400, 1280 are valid.
const PREFERRED_WIDTH = 1280;
const FALLBACK_WIDTH = 330;

function extractFilename(url) {
  if (!url) return "";
  return decodeURIComponent(url.split("/").pop() || "");
}

async function checkUrl(url, timeoutMs = 10000) {
  if (!url) return 0;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      headers: { "User-Agent": "TDTY-App/1.0" },
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
      headers: { "User-Agent": "TDTY-App/1.0" },
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

function fixThumbnailUrl(url) {
  if (!url) return url;

  // Direct commons URLs (not thumbnails) — leave as-is, always work
  if (!url.includes("/thumb/")) return url;

  // Replace any invalid width with 1280px
  // Match: /NNNpx-filename at the end of thumbnail URLs
  const match = url.match(/\/(\d+)px-([^/]+)$/);
  if (!match) return url;

  const currentWidth = parseInt(match[1]);
  const filename = match[2];

  // If already a valid width, keep it
  if ([120, 150, 200, 220, 250, 300, 320, 330, 400, 440, 500, 1200, 1280].includes(currentWidth)) {
    return url;
  }

  // Replace with 1280px (or 330px if preferred)
  return url.replace(/\/\d+px-([^/]+)$/, `/${PREFERRED_WIDTH}px-${filename}`);
}

async function main() {
  const events = JSON.parse(fs.readFileSync(EVENTS_FILE, "utf-8"));

  // Phase 1: Fix all thumbnail URLs to use valid widths
  let fixed = 0;
  let alreadyOk = 0;
  let noUrl = 0;
  let directUrl = 0;

  for (const [key, dayEvents] of Object.entries(events)) {
    for (let i = 0; i < dayEvents.length; i++) {
      const ev = dayEvents[i];
      if (!ev.image_url) { noUrl++; continue; }

      if (!ev.image_url.includes("/thumb/")) {
        directUrl++;
        continue;
      }

      const newUrl = fixThumbnailUrl(ev.image_url);
      if (newUrl !== ev.image_url) {
        events[key][i].image_url = newUrl;
        events[key][i].image_filename = extractFilename(newUrl);
        events[key][i].image_credit = extractFilename(newUrl) + " - Wikimedia Commons";
        fixed++;
      } else {
        alreadyOk++;
      }
    }
  }

  console.log("Phase 1 — URL format fix:");
  console.log(`  Fixed: ${fixed}`);
  console.log(`  Already valid: ${alreadyOk}`);
  console.log(`  Direct URLs: ${directUrl}`);
  console.log(`  No URL: ${noUrl}`);

  // Phase 2: Verify a sample of fixed URLs
  console.log("\nPhase 2 — Verifying sample of fixed URLs...");
  const thumbEvents = [];
  for (const [key, dayEvents] of Object.entries(events)) {
    for (const ev of dayEvents) {
      if (ev.image_url && ev.image_url.includes("/thumb/")) {
        thumbEvents.push(ev);
      }
    }
  }

  // Test 15 evenly spaced samples
  const step = Math.floor(thumbEvents.length / 15);
  let ok = 0, fail = 0;
  for (let i = 0; i < thumbEvents.length; i += step) {
    const ev = thumbEvents[i];
    const status = await checkUrl(ev.image_url);
    const label = status === 200 ? "OK" : String(status);
    console.log(`  ${label} | ${ev.title} | ...${ev.image_url.slice(-50)}`);
    if (status === 200) ok++;
    else fail++;
    await delay(600);
    if (ok + fail >= 15) break;
  }
  console.log(`  Results: ${ok} OK, ${fail} failed out of 15 samples`);

  // Phase 3: For 1280px URLs that fail, try falling back to 330px
  if (fail > 0) {
    console.log("\nPhase 3 — Checking if 1280px fails need 330px fallback...");
    // Test a failing URL at 330px
    const failingEvent = thumbEvents.find((ev) => ev.image_url.includes("/1280px-"));
    if (failingEvent) {
      const url330 = failingEvent.image_url.replace("/1280px-", "/330px-");
      const status330 = await checkUrl(url330);
      console.log(`  330px test: ${status330} | ${url330.slice(-50)}`);
    }
  }

  // Save
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));
  console.log("\nSaved events.json");
  console.log("Run: npm run split-data");
}

main().catch(console.error);
