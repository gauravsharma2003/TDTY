const fs = require("node:fs");
const path = require("node:path");

const file = path.join(__dirname, "..", "events.json");
const eventsByDate = JSON.parse(fs.readFileSync(file, "utf8"));
const expectedDates = new Set();
for (let month = 1; month <= 12; month++) {
  const days = new Date(2024, month, 0).getDate();
  for (let day = 1; day <= days; day++) {
    expectedDates.add(`${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  }
}

const errors = [];
const records = [];
for (const date of expectedDates) {
  const dayEvents = eventsByDate[date];
  if (!Array.isArray(dayEvents) || dayEvents.length === 0) {
    errors.push(`${date}: missing event list`);
    continue;
  }

  dayEvents.forEach((event, index) => {
    const label = `${date} event ${index + 1}`;
    if (!Number.isInteger(event.year)) errors.push(`${label}: year is not an integer`);
    if (!event.title?.trim()) errors.push(`${label}: missing title`);
    if (!event.subtitle?.trim()) errors.push(`${label}: missing subtitle`);
    if (!event.text?.trim()) errors.push(`${label}: missing description`);
    if (!event.image_url || !/^https:\/\//i.test(event.image_url)) {
      errors.push(`${label}: image URL must be HTTPS`);
    }

    records.push({ ...event, date, label });
  });
}

for (const date of Object.keys(eventsByDate)) {
  if (!expectedDates.has(date)) errors.push(`${date}: unexpected date key`);
}

const titleCounts = new Map();
for (const event of records) {
  const title = event.title.trim().toLocaleLowerCase("en");
  titleCounts.set(title, (titleCounts.get(title) || 0) + 1);
}

const shortDescriptions = records.filter((event) => event.text.trim().length < 100);
const missingSources = records.filter((event) => !event.sources?.some((source) => {
  try {
    return ["http:", "https:"].includes(new URL(source.url).protocol) && source.label?.trim();
  } catch {
    return false;
  }
}));
const repeatedTitles = [...titleCounts.values()].filter((count) => count > 1).length;

console.log(`Date pages in dataset: ${expectedDates.size}`);
console.log(`Event records checked: ${records.length}`);
console.log(`Descriptions under 100 characters: ${shortDescriptions.length}`);
console.log(`Records with no valid factual source link: ${missingSources.length}`);
console.log(`Titles repeated across records (review; may be legitimate): ${repeatedTitles}`);

if (shortDescriptions.length) {
  console.log("\nShortest descriptions for editorial review:");
  for (const event of [...shortDescriptions]
    .sort((a, b) => a.text.length - b.text.length)
    .slice(0, 10)) {
    console.log(`- ${event.label}: ${event.title} (${event.text.trim().length} chars)`);
  }
}

if (errors.length) {
  console.error(`\nStructural errors (${errors.length}):`);
  for (const error of errors.slice(0, 50)) console.error(`- ${error}`);
  if (errors.length > 50) console.error(`- …and ${errors.length - 50} more`);
  process.exitCode = 1;
} else {
  console.log("\nStructural checks passed. Content flags are review queues, not automatic failures.");
}
