const fs = require("fs");
const path = require("path");

const RAW_FILE = path.join(__dirname, "..", "wikipedia-raw.json");
const ENRICHED_FILE = path.join(__dirname, "..", "wikipedia-events.json");
const DELAY_MS = 200;

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJSON(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "TDTY-App/1.0 (history-app)" },
      });
      if (res.ok) return await res.json();
      if (res.status === 429) {
        console.error("  Rate limited, waiting 3s...");
        await delay(3000);
        continue;
      }
      console.error(`  HTTP ${res.status} for ${url}`);
      return null;
    } catch (err) {
      console.error(`  Fetch error (attempt ${i + 1}): ${err.message}`);
      await delay(1000);
    }
  }
  return null;
}

// All 366 days (using 2024, a leap year)
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
  // Tech & Innovation
  "apple", "microsoft", "google", "samsung", "iphone", "macintosh", "computer",
  "internet", "web", "software", "tesla", "spacex", "amazon", "facebook", "twitter",
  "ibm", "intel", "nokia", "android", "windows", "linux", "bitcoin", "telephone",
  "telegraph", "radio", "television", "transistor", "microchip", "algorithm",
  // Space
  "nasa", "voyager", "apollo", "space", "mars", "moon", "satellite", "astronaut",
  "cosmonaut", "orbit", "rocket", "shuttle", "hubble", "iss ", "pluto", "spacecraft",
  "sputnik", "mercury", "gemini", "skylab", "mir ",
  // Science & Medicine
  "dna", "vaccine", "penicillin", "einstein", "nobel", "atom", "nuclear",
  "discovery", "discovered", "invention", "invented", "theory", "element",
  "particle", "genome", "cloning", "x-ray", "relativity", "evolution",
  "periodic table", "electricity", "quantum", "antibiotic",
  // Geopolitics & History
  "independence", "revolution", "constitution", "treaty", "peace",
  "united nations", "nato", "berlin wall", "cold war", "apartheid", "civil rights",
  "suffrage", "vote", "democracy", "republic", "empire", "colony", "freedom",
  "abolition", "slavery", "emancipation", "sovereign",
  // Culture & Society
  "olympic", "world cup", "oscar", "grammy", "emmy", "beatles", "elvis",
  "disney", "hollywood", "broadway", "nobel prize", "pulitzer", "world fair",
  "exposition", "museum",
  // Firsts & Records
  "first", "record", "largest", "longest", "fastest", "youngest", "oldest",
  "maiden voyage", "debut", "launched", "founded", "established", "opened",
  "inaugural", "pioneered", "breakthrough",
  // Major Events & Disasters
  "earthquake", "tsunami", "eruption", "titanic", "chernobyl", "pandemic",
  "assassination", "coup", "massacre", "famine", "plague", "collapse",
  // War milestones (not all wars, just famous ones)
  "world war", "d-day", "pearl harbor", "hiroshima", "nagasaki", "armistice",
  "surrender", "liberation", "blitzkrieg", "dunkirk",
];

function scoreEvent(event) {
  const text = (event.text || "").toLowerCase();
  let score = 0;

  for (const kw of INTERESTING_KEYWORDS) {
    if (text.includes(kw)) score += 1;
  }

  // Boost events with more Wikipedia page links (indicates significance)
  const pageCount = (event.pages || []).length;
  score += Math.min(pageCount * 0.3, 3);

  // Boost modern events people can relate to
  const year = event.year || 0;
  if (year >= 1900 && year <= 2025) score += 1;
  if (year >= 1950 && year <= 2025) score += 1.5;

  // Boost events with images
  if (event.pages?.[0]?.thumbnail) score += 0.5;

  // Penalize very short descriptions (likely less notable)
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
  // If text has a prefix like "Cold War:" or "Vietnam War:", use it
  const colonMatch = text.match(/^([A-Z][\w\s'''-]+):\s/);
  if (colonMatch && colonMatch[1].length <= 40) {
    return colonMatch[1];
  }
  // Use first linked page title, cleaned up
  const page = event.pages?.[0];
  if (page) {
    let title = page.title.replace(/_/g, " ");
    // Remove disambiguation suffixes like "(event)" or "(1969)"
    title = title.replace(/\s*\(.*?\)\s*/g, "").trim();
    // Shorten to ~6 words
    const words = title.split(" ");
    if (words.length > 6) return words.slice(0, 6).join(" ");
    return title;
  }
  // Fallback: first 6 words of event text
  return text.split(" ").slice(0, 6).join(" ");
}

function extractFilename(url) {
  if (!url) return "";
  const parts = url.split("/");
  return decodeURIComponent(parts[parts.length - 1] || "");
}

// ─── Phase 1: Fetch all 366 days ─────────────────────────────────

async function phase1() {
  if (fs.existsSync(RAW_FILE)) {
    console.log("Phase 1: Using cached data from wikipedia-raw.json");
    return JSON.parse(fs.readFileSync(RAW_FILE, "utf-8"));
  }

  const days = getAllDays();
  const results = {};
  let done = 0;

  for (const { month, day } of days) {
    const key = `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const url = `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/events/${month}/${day}`;
    const data = await fetchJSON(url);

    if (data && data.events) {
      const scored = data.events.map((e) => ({ ...e, _score: scoreEvent(e) }));
      scored.sort((a, b) => b._score - a._score);
      results[key] = scored.slice(0, 5);
    } else {
      results[key] = [];
    }

    done++;
    if (done % 30 === 0 || done === days.length) {
      console.log(`Phase 1: ${done}/${days.length} days fetched`);
    }

    await delay(DELAY_MS);
  }

  fs.writeFileSync(RAW_FILE, JSON.stringify(results, null, 2));
  console.log(`Phase 1 complete: saved ${Object.keys(results).length} days to wikipedia-raw.json`);
  return results;
}

// ─── Phase 2: Enrich with article summaries ──────────────────────

async function phase2(rawEvents) {
  // Check for checkpoint — partial enrichment
  let enriched = {};
  let startFrom = null;
  if (fs.existsSync(ENRICHED_FILE)) {
    enriched = JSON.parse(fs.readFileSync(ENRICHED_FILE, "utf-8"));
    const enrichedKeys = Object.keys(enriched);
    const allKeys = Object.keys(rawEvents);
    if (enrichedKeys.length >= allKeys.length) {
      console.log("Phase 2: Already complete, using cached data");
      return enriched;
    }
    startFrom = enrichedKeys[enrichedKeys.length - 1];
    console.log(`Phase 2: Resuming from after ${startFrom} (${enrichedKeys.length} already done)`);
  }

  const entries = Object.entries(rawEvents);
  let skipping = startFrom !== null;
  let done = Object.keys(enriched).length;

  for (const [key, events] of entries) {
    if (skipping) {
      if (key === startFrom) skipping = false;
      continue;
    }

    enriched[key] = [];

    for (const event of events) {
      const page = event.pages?.[0];
      let summary = null;

      if (page) {
        const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(page.title)}`;
        summary = await fetchJSON(url);
        await delay(150);
      }

      // Build narrative text
      let text = event.text;
      if (summary?.extract && summary.extract.length > text.length) {
        // Use article extract if it's more substantial
        text = summary.extract;
      }
      // Ensure reasonable length (trim to ~400 words)
      const words = text.split(" ");
      if (words.length > 80) {
        text = words.slice(0, 80).join(" ");
        // End at last complete sentence
        const lastPeriod = text.lastIndexOf(".");
        if (lastPeriod > text.length * 0.5) {
          text = text.substring(0, lastPeriod + 1);
        }
      }

      // Build subtitle from event text (first sentence)
      let subtitle = event.text;
      const firstDot = subtitle.indexOf(".");
      if (firstDot > 0 && firstDot < 150) {
        subtitle = subtitle.substring(0, firstDot + 1);
      } else if (subtitle.length > 120) {
        subtitle = subtitle.substring(0, 120) + "...";
      }

      // Try to get a better image (larger)
      let imageUrl = "";
      if (page?.thumbnail?.source) {
        // Replace thumbnail size with larger version
        imageUrl = page.thumbnail.source.replace(/\/\d+px-/, "/800px-");
      } else if (summary?.thumbnail?.source) {
        imageUrl = summary.thumbnail.source.replace(/\/\d+px-/, "/800px-");
      }

      // Try to derive location from summary description
      let location = "";
      if (summary?.description) {
        location = summary.description;
      }

      const historyEvent = {
        year: event.year,
        title: deriveTitle(event),
        subtitle: subtitle,
        text: text,
        location: location,
        era: getEra(event.year),
        image_url: imageUrl,
        image_filename: extractFilename(imageUrl),
        image_credit: extractFilename(imageUrl)
          ? extractFilename(imageUrl) + " - Wikimedia Commons"
          : "",
      };

      enriched[key].push(historyEvent);
    }

    done++;
    if (done % 30 === 0) {
      // Save checkpoint
      fs.writeFileSync(ENRICHED_FILE, JSON.stringify(enriched, null, 2));
      console.log(`Phase 2: ${done}/${entries.length} days enriched (checkpoint saved)`);
    }
  }

  fs.writeFileSync(ENRICHED_FILE, JSON.stringify(enriched, null, 2));
  console.log(`Phase 2 complete: ${Object.keys(enriched).length} days enriched`);
  return enriched;
}

// ─── Phase 3: Merge with existing events.json ───────────────────

function phase3(enrichedEvents) {
  const EVENTS_FILE = path.join(__dirname, "..", "events.json");
  const existing = JSON.parse(fs.readFileSync(EVENTS_FILE, "utf-8"));

  let added = 0;
  for (const [key, newEvents] of Object.entries(enrichedEvents)) {
    if (!existing[key]) {
      existing[key] = [];
    }

    // Deduplicate by checking year + rough title match
    const existingYears = new Set(existing[key].map((e) => e.year));

    for (const newEvent of newEvents) {
      // Skip if we already have an event from the same year
      if (existingYears.has(newEvent.year)) continue;

      // Skip if event has no image
      if (!newEvent.image_url) continue;

      existing[key].push(newEvent);
      existingYears.add(newEvent.year);
      added++;
    }
  }

  // Sort each day's events by year
  for (const key of Object.keys(existing)) {
    existing[key].sort((a, b) => a.year - b.year);
  }

  fs.writeFileSync(EVENTS_FILE, JSON.stringify(existing, null, 2));
  console.log(`Phase 3 complete: Added ${added} new events to events.json`);

  // Stats
  const totalEvents = Object.values(existing).reduce((s, arr) => s + arr.length, 0);
  const avgPerDay = (totalEvents / Object.keys(existing).length).toFixed(1);
  console.log(`Total events: ${totalEvents} across ${Object.keys(existing).length} days (avg ${avgPerDay}/day)`);
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  console.log("=== TDTY Wikipedia Event Enrichment Pipeline ===\n");

  console.log("Phase 1: Fetching events for all 366 days...");
  const raw = await phase1();
  console.log();

  console.log("Phase 2: Enriching with article summaries & images...");
  const enriched = await phase2(raw);
  console.log();

  console.log("Phase 3: Merging into events.json...");
  phase3(enriched);
  console.log();

  console.log("=== Done! Run 'npm run split-data' to update public/data/ ===");
}

main().catch(console.error);
