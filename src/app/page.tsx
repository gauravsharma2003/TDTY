import fs from "fs";
import path from "path";
import TDTYApp from "@/components/TDTYApp";
import { HistoryEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function Home() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const dateKey = `${mm}-${dd}`;
  const eventIndex = now.getFullYear() % 3;

  const eventsData = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "events.json"), "utf-8")
  );

  const dayEvents: HistoryEvent[] = eventsData[dateKey] || [];
  const event = dayEvents[eventIndex] ?? dayEvents[0];

  const monthShort = now
    .toLocaleDateString("en-US", { month: "short" })
    .toUpperCase();
  const day = now.getDate();

  if (!event) return null;

  return <TDTYApp event={event} monthShort={monthShort} day={day} />;
}
