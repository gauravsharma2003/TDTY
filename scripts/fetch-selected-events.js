const fs = require("fs");
const path = require("path");

const SELECTED_FILE = path.join(__dirname, "..", "wikipedia-selected.json");
const EVENTS_FILE = path.join(__dirname, "..", "events.json");

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

function extractFilename(url) {
  if (!url) return "";
  return decodeURIComponent(url.split("/").pop() || "");
}

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

async function main() {
  console.log("=== Fetching Wikipedia 'selected' events for all 366 days ===\n");

  // Phase 1: Fetch all selected events
  let selected = {};
  if (fs.existsSync(SELECTED_FILE)) {
    console.log("Using cached wikipedia-selected.json");
    selected = JSON.parse(fs.readFileSync(SELECTED_FILE, "utf-8"));
  } else {
    const days = getAllDays();
    let done = 0;

    await pMap(days, async ({ month, day }) => {
      const key = `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const url = `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/selected/${month}/${day}`;
      const data = await fetchJSON(url);

      if (data?.selected) {
        // Score: prioritize modern, notable events with images
        const scored = data.selected.map((e) => {
          let score = (e.pages || []).length * 0.5;
          const year = e.year || 0;
          if (year >= 1900) score += 2;
          if (year >= 1950) score += 2;
          if (e.pages?.[0]?.thumbnail) score += 1;
          const text = (e.text || "").toLowerCase();
          if (text.length > 100) score += 1;
          return { ...e, _score: score };
        });
        scored.sort((a, b) => b._score - a._score);
        selected[key] = scored.slice(0, 5);
      } else {
        selected[key] = [];
      }

      done++;
      if (done % 50 === 0 || done === days.length) console.log(`Fetch: ${done}/${days.length}`);
    }, 5);

    fs.writeFileSync(SELECTED_FILE, JSON.stringify(selected, null, 2));
    console.log(`Saved ${Object.keys(selected).length} days\n`);
  }

  // Phase 2: Enrich selected events with article summaries
  console.log("Enriching with article summaries...");
  const tasks = [];
  for (const [key, events] of Object.entries(selected)) {
    for (const event of events) {
      tasks.push({ key, event });
    }
  }

  const enrichedMap = {};
  let done2 = 0;

  await pMap(tasks, async ({ key, event }) => {
    const page = event.pages?.[0];
    let summary = null;

    if (page) {
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(page.title)}`;
      summary = await fetchJSON(url, 8000);
    }

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

    // Title: use colon prefix or first page title
    let title = "";
    const colonMatch = event.text.match(/^([A-Z][\w\s'''-]+):\s/);
    if (colonMatch && colonMatch[1].length <= 40) {
      title = colonMatch[1];
    } else if (page) {
      title = page.title.replace(/_/g, " ").replace(/\s*\(.*?\)\s*/g, "").trim();
      if (title.split(" ").length > 6) title = title.split(" ").slice(0, 6).join(" ");
    } else {
      title = event.text.split(" ").slice(0, 6).join(" ");
    }

    // Subtitle
    let subtitle = event.text;
    const firstDot = subtitle.indexOf(".");
    if (firstDot > 0 && firstDot < 150) subtitle = subtitle.substring(0, firstDot + 1);
    else if (subtitle.length > 120) subtitle = subtitle.substring(0, 120) + "...";

    // Image
    let imageUrl = "";
    if (page?.thumbnail?.source) {
      imageUrl = page.thumbnail.source.replace(/\/\d+px-/, "/800px-");
    } else if (summary?.thumbnail?.source) {
      imageUrl = summary.thumbnail.source.replace(/\/\d+px-/, "/800px-");
    }

    const historyEvent = {
      year: event.year,
      title,
      subtitle,
      text,
      location: summary?.description || "",
      era: getEra(event.year),
      image_url: imageUrl,
      image_filename: extractFilename(imageUrl),
      image_credit: extractFilename(imageUrl) ? extractFilename(imageUrl) + " - Wikimedia Commons" : "",
    };

    if (!enrichedMap[key]) enrichedMap[key] = [];
    enrichedMap[key].push(historyEvent);

    done2++;
    if (done2 % 100 === 0) console.log(`Enrich: ${done2}/${tasks.length}`);
  }, 10);

  // Phase 3: Merge into events.json
  console.log("\nMerging into events.json...");
  const existing = JSON.parse(fs.readFileSync(EVENTS_FILE, "utf-8"));
  let added = 0;

  for (const [key, newEvents] of Object.entries(enrichedMap)) {
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
  console.log(`Added ${added} selected events -> ${total} total (${(total / Object.keys(existing).length).toFixed(1)} avg/day)`);
  console.log("Done!");
}

main().catch(console.error);
