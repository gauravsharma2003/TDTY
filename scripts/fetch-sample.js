const fs = require("fs");

const DAYS = [];
for (let d = 8; d <= 17; d++) {
  DAYS.push({ month: 3, day: d });
}

async function fetchDay(month, day) {
  const url = `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/events/${month}/${day}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "TDTY-App/1.0 (gaurav@example.com)" },
  });
  if (!res.ok) throw new Error(`Failed ${month}/${day}: ${res.status}`);
  const data = await res.json();
  return data.events || [];
}

// Keywords that signal "interesting" events
const INTERESTING_KEYWORDS = [
  // Tech
  "apple", "microsoft", "google", "samsung", "iphone", "macintosh", "computer",
  "internet", "web", "software", "tesla", "spacex", "amazon", "facebook", "twitter",
  "ibm", "intel", "nokia", "android", "windows", "linux", "bitcoin", "ai ",
  // Space
  "nasa", "voyager", "apollo", "space", "mars", "moon", "satellite", "astronaut",
  "cosmonaut", "orbit", "rocket", "shuttle", "hubble", "iss ", "pluto",
  // Science
  "dna", "vaccine", "penicillin", "einstein", "nobel", "atom", "nuclear",
  "discovery", "discovered", "invention", "invented", "theory", "element",
  "particle", "genome", "crispr", "cloning",
  // Geopolitics
  "independence", "revolution", "constitution", "treaty", "war", "peace",
  "united nations", "nato", "berlin wall", "cold war", "apartheid", "civil rights",
  "suffrage", "vote", "democracy", "republic", "empire", "colony", "freedom",
  // Culture
  "olympic", "world cup", "oscar", "grammy", "emmy", "beatles", "elvis",
  "disney", "hollywood", "broadway", "nobel prize", "pulitzer",
  // Firsts & Records
  "first", "record", "largest", "longest", "fastest", "youngest", "oldest",
  "maiden voyage", "debut", "launched", "founded", "established", "opened",
  // Disasters & Major Events
  "earthquake", "tsunami", "eruption", "titanic", "chernobyl", "pandemic",
  "assassination", "coup",
];

function scoreEvent(event) {
  const text = (event.text || "").toLowerCase();
  let score = 0;
  for (const kw of INTERESTING_KEYWORDS) {
    if (text.includes(kw)) score += 1;
  }
  // Boost events with more page links (indicates significance)
  score += Math.min((event.pages || []).length * 0.3, 3);
  // Boost events in years people recognize
  const year = event.year || 0;
  if (year >= 1900 && year <= 2025) score += 1;
  if (year >= 1950 && year <= 2025) score += 1;
  return score;
}

async function main() {
  const results = {};

  for (const { month, day } of DAYS) {
    const key = `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    console.error(`Fetching ${key}...`);
    const events = await fetchDay(month, day);

    // Score and sort
    const scored = events.map((e) => ({ ...e, _score: scoreEvent(e) }));
    scored.sort((a, b) => b._score - a._score);

    // Take top 5
    const top = scored.slice(0, 5).map((e) => ({
      year: e.year,
      text: e.text,
      score: e._score,
      pages: (e.pages || []).slice(0, 2).map((p) => p.title),
      image: e.pages?.[0]?.thumbnail?.source || null,
    }));

    results[key] = top;

    // Rate limit
    await new Promise((r) => setTimeout(r, 200));
  }

  // Output as JSON
  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
