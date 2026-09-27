import fs from "node:fs";
import path from "node:path";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { HistoryEvent } from "@/lib/types";

export async function getEventsForDate(dateKey: string): Promise<HistoryEvent[]> {
  const dataPath = path.join(process.cwd(), "public", "data", `${dateKey}.json`);
  if (fs.existsSync(dataPath)) {
    return JSON.parse(fs.readFileSync(dataPath, "utf8")) as HistoryEvent[];
  }

  let assets;
  try {
    assets = (await getCloudflareContext({ async: true })).env.ASSETS;
  } catch {
    // Local Next.js development may not have a Cloudflare runtime context.
  }

  if (assets) {
    const response = await assets.fetch(new Request(`https://assets.local/data/${dateKey}.json`));
    if (!response.ok) {
      throw new Error(`Could not load historical events for ${dateKey}: ${response.status}`);
    }
    return (await response.json()) as HistoryEvent[];
  }

  const sourcePath = path.join(process.cwd(), "events.json");
  if (fs.existsSync(sourcePath)) {
    const allEvents = JSON.parse(fs.readFileSync(sourcePath, "utf8")) as Record<string, HistoryEvent[]>;
    return allEvents[dateKey] ?? [];
  }

  throw new Error(`No event data source is available for ${dateKey}`);
}
