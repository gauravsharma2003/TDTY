const fs = require("fs");
const path = require("path");

const EVENTS_FILE = path.join(__dirname, "..", "events.json");
const OUTPUT_DIR = path.join(__dirname, "..", "public", "data");

const events = JSON.parse(fs.readFileSync(EVENTS_FILE, "utf-8"));

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

let count = 0;
for (const [key, dayEvents] of Object.entries(events)) {
  fs.writeFileSync(
    path.join(OUTPUT_DIR, `${key}.json`),
    JSON.stringify(dayEvents)
  );
  count++;
}

console.log(`Split ${count} days into ${OUTPUT_DIR}`);
