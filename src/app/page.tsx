import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import TDTYApp from "@/components/TDTYApp";
import { HistoryEvent } from "@/lib/types";

export const revalidate = 3600;

function getTodayEvent() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const dateKey = `${mm}-${dd}`;
  const eventIndex = now.getFullYear() % 3;

  const filePath = path.join(process.cwd(), "public", "data", `${dateKey}.json`);
  const dayEvents: HistoryEvent[] = fs.existsSync(filePath)
    ? JSON.parse(fs.readFileSync(filePath, "utf-8"))
    : JSON.parse(fs.readFileSync(path.join(process.cwd(), "events.json"), "utf-8"))[dateKey] || [];

  const event = dayEvents[eventIndex] ?? dayEvents[0];
  const monthShort = now.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const day = now.getDate();

  return { event, monthShort, day };
}

export async function generateMetadata(): Promise<Metadata> {
  const { event } = getTodayEvent();
  if (!event) return {};
  return {
    title: `${event.title} — This Day That Year`,
    description: event.subtitle,
    openGraph: {
      title: event.title,
      description: event.text.slice(0, 200),
      images: [event.image_url],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description: event.subtitle,
      images: [event.image_url],
    },
  };
}

export default function Home() {
  const { event, monthShort, day } = getTodayEvent();
  if (!event) return null;
  return <TDTYApp event={event} monthShort={monthShort} day={day} />;
}
