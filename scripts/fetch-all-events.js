const fs = require("fs");
const path = require("path");

const RAW_FILE = path.join(__dirname, "..", "wikipedia-raw.json");
const ENRICHED_FILE = path.join(__dirname, "..", "wikipedia-events.json");

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJSON(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "TDTY-App/1.0 (history-app)" },
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

// All 366 days (2024 is leap year)
function getAllDays() {
  const days = [];
  for (let m = 1; m <= 12; m++) {
    const daysInMonth = new Date(2024, m, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ month: m, day: d });
    }
  }
  return days;
}

const INTERESTING_KEYWORDS = [
  "apple", "microsoft", "google", "samsung", "iphone", "macintosh", "computer",
  "internet", "web", "software", "tesla", "spacex", "amazon", "facebook", "twitter",
  "ibm", "intel", "nokia", "android", "windows", "linux", "bitcoin", "telephone",
  "telegraph", "radio", "television", "transistor",
  "nasa", "voyager", "apollo", "space", "mars", "moon", "satellite", "astronaut",
  "cosmonaut", "orbit", "rocket", "shuttle", "hubble", "pluto", "spacecraft",
  "sputnik", "gemini", "skylab",
  "dna", "vaccine", "penicillin", "einstein", "nobel", "atom", "nuclear",
  "discovery", "discovered", "invention", "invented", "theory", "element",
  "particle", "genome", "cloning", "x-ray", "relativity",
  "independence", "revolution", "constitution", "treaty", "peace",
  "united nations", "nato", "berlin wall", "cold war", "apartheid", "civil rights",
  "suffrage", "democracy", "republic", "empire", "freedom",
  "abolition", "slavery", "emancipation", "sovereign",
  "olympic", "world cup", "oscar", "grammy", "beatles", "elvis",
  "disney", "hollywood", "nobel prize", "pulitzer",
  "first", "record", "largest", "longest", "fastest",
  "maiden voyage", "debut", "launched", "founded", "established", "opened",
  "inaugural", "breakthrough",
  "earthquake", "tsunami", "eruption", "titanic", "chernobyl", "pandemic",
  "assassination", "coup", "massacre", "famine", "collapse",
  "world war", "d-day", "pearl harbor", "hiroshima", "nagasaki", "armistice",
  "surrender", "liberation", "dunkirk",
];

function scoreEvent(event) {
  const text = (event.text || "").toLowerCase();
  let score = 0;
  for (const kw of INTERESTING_KEYWORDS) {
    if (text.includes(kw)) score += 1;
  }
  score += Math.min((event.pages || []).length * 0.3, 3);
  const year = event.year || 0;
  if (year >= 1900 && year <= 2025) score += 1;
  if (year >= 1950 && year <= 2025) score += 1.5;
  if (event.pages?.[0]?.thumbnail) score += 0.5;
  if (text.length < 50) score -= 1;
  return score;
}

function getEra(year) {
  if (year < -500) return "Ancient";
  if (year <= 500) return "Classical";
  if (year <= 1500) return "Medieval";
  if (year <= 1700) return "Early Modern";
  if (year <= 1900) return "Modern";
  if (year <= 1950) return "Early 20th Century";
  if (year <= 2000) return "Late 20th Century";
  return "21st Century";
}

function deriveTitle(event) {
  const text = event.text || "";
  const colonMatch = text.match(/^([A-Z][\w\s'''-]+):\s/);
  if (colonMatch && colonMatch[1].length <= 40) return colonMatch[1];
  const page = event.pages?.[0];
  if (page) {
    let title = page.title.replace(/_/g, " ").replace(/\s*\(.*?\)\s*/g, "").trim();
    const words = title.split(" ");
    if (words.length > 6) return words.slice(0, 6).join(" ");
    return title;
  }
  return text.split(" ").slice(0, 6).join(" ");
}

function extractFilename(url) {
  if (!url) return "";
  return decodeURIComponent(url.split("/").pop() || "");
}

// Run N promises with concurrency limit
async function pMap(items, fn, concurrency = 5) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

// ─── Phase 1: Fetch all 366 days (5 concurrent) ─────────────────

async function phase1() {
  if (fs.existsSync(RAW_FILE)) {
    console.log("Phase 1: Using cached wikipedia-raw.json");
    return JSON.parse(fs.readFileSync(RAW_FILE, "utf-8"));
  }

  const days = getAllDays();
  const results = {};
  let done = 0;

  await pMap(days, async ({ month, day }) => {
    const key = `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const url = `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/events/${month}/${day}`;
    const data = await fetchJSON(url);

    if (data?.events) {
      const scored = data.events.map((e) => ({ ...e, _score: scoreEvent(e) }));
      scored.sort((a, b) => b._score - a._score);
      results[key] = scored.slice(0, 5);
    } else {
      results[key] = [];
    }

    done++;
    if (done % 50 === 0 || done === days.length) {
      console.log(`Phase 1: ${done}/${days.length}`);
    }
  }, 5);

  fs.writeFileSync(RAW_FILE, JSON.stringify(results, null, 2));
  console.log(`Phase 1 done: ${Object.keys(results).length} days saved`);
  return results;
}

// ─── Phase 2: Enrich with article summaries (10 concurrent) ─────

async function phase2(rawEvents) {
  if (fs.existsSync(ENRICHED_FILE)) {
    const existing = JSON.parse(fs.readFileSync(ENRICHED_FILE, "utf-8"));
    if (Object.keys(existing).length >= 366) {
      console.log("Phase 2: Using cached wikipedia-events.json");
      return existing;
    }
  }

  // Flatten all events with their day keys
  const tasks = [];
  for (const [key, events] of Object.entries(rawEvents)) {
    for (const event of events) {
      tasks.push({ key, event });
    }
  }

  console.log(`Phase 2: Enriching ${tasks.length} events...`);
  let done = 0;
  const enrichedMap = {};

  await pMap(tasks, async ({ key, event }) => {
    const page = event.pages?.[0];
    let summary = null;

    if (page) {
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(page.title)}`;
      summary = await fetchJSON(url, 8000);
    }

    // Build narrative text
    let text = event.text;
    if (summary?.extract && summary.extract.length > text.length) {
      text = summary.extract;
    }
    const words = text.split(" ");
    if (words.length > 80) {
      text = words.slice(0, 80).join(" ");
      const lastPeriod = text.lastIndexOf(".");
      if (lastPeriod > text.length * 0.5) text = text.substring(0, lastPeriod + 1);
    }

    // Subtitle from event text
    let subtitle = event.text;
    const firstDot = subtitle.indexOf(".");
    if (firstDot > 0 && firstDot < 150) subtitle = subtitle.substring(0, firstDot + 1);
    else if (subtitle.length > 120) subtitle = subtitle.substring(0, 120) + "...";

    // Image (larger version)
    let imageUrl = "";
    if (page?.thumbnail?.source) {
      imageUrl = page.thumbnail.source.replace(/\/\d+px-/, "/800px-");
    } else if (summary?.thumbnail?.source) {
      imageUrl = summary.thumbnail.source.replace(/\/\d+px-/, "/800px-");
    }

    // Location from summary
    let location = summary?.description || "";

    const historyEvent = {
      year: event.year,
      title: deriveTitle(event),
      subtitle,
      text,
      location,
      era: getEra(event.year),
      image_url: imageUrl,
      image_filename: extractFilename(imageUrl),
      image_credit: extractFilename(imageUrl) ? extractFilename(imageUrl) + " - Wikimedia Commons" : "",
    };

    if (!enrichedMap[key]) enrichedMap[key] = [];
    enrichedMap[key].push(historyEvent);

    done++;
    if (done % 100 === 0) console.log(`Phase 2: ${done}/${tasks.length}`);
  }, 10);

  fs.writeFileSync(ENRICHED_FILE, JSON.stringify(enrichedMap, null, 2));
  console.log(`Phase 2 done: ${Object.keys(enrichedMap).length} days enriched`);
  return enrichedMap;
}

// ─── Phase 3: Merge ─────────────────────────────────────────────

function phase3(enrichedEvents) {
  const EVENTS_FILE = path.join(__dirname, "..", "events.json");
  const existing = JSON.parse(fs.readFileSync(EVENTS_FILE, "utf-8"));

  let added = 0;
  for (const [key, newEvents] of Object.entries(enrichedEvents)) {
    if (!existing[key]) existing[key] = [];
    const existingYears = new Set(existing[key].map((e) => e.year));

    for (const ne of newEvents) {
      if (existingYears.has(ne.year)) continue;
      if (!ne.image_url) continue;
      existing[key].push(ne);
      existingYears.add(ne.year);
      added++;
    }

    existing[key].sort((a, b) => a.year - b.year);
  }

  fs.writeFileSync(EVENTS_FILE, JSON.stringify(existing, null, 2));
  const total = Object.values(existing).reduce((s, a) => s + a.length, 0);
  console.log(`Phase 3 done: +${added} events → ${total} total (${(total / Object.keys(existing).length).toFixed(1)} avg/day)`);
}

// ─── Main ───────────────────────────────────────────────────────

async function main() {
  console.log("=== TDTY Wikipedia Event Enrichment ===\n");
  const raw = await phase1();
  const enriched = await phase2(raw);
  phase3(enriched);
  console.log("\nDone! Run: npm run split-data");
}

main().catch(console.error);
