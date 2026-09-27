import { NextResponse } from "next/server";
import { dateKeyToSlug } from "@/lib/date-slugs";
import { getEventsForDate } from "@/lib/events-data";
import type { HistoryEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateKey = searchParams.get("date") ?? "";
  const yearValue = Number(searchParams.get("year"));
  const [month, day] = dateKey.split("-").map(Number);
  const validDate = /^\d{2}-\d{2}$/.test(dateKey)
    && Number.isInteger(month) && month >= 1 && month <= 12
    && Number.isInteger(day) && day >= 1
    && day <= new Date(2024, month, 0).getDate();

  if (!validDate || !Number.isInteger(yearValue) || yearValue < 1 || yearValue > 9999) {
    return NextResponse.json({ error: "Invalid date" }, {
      status: 400,
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  }

  const dayEvents = await getEventsForDate(dateKey);
  if (!dayEvents.length) {
    return NextResponse.json({ error: "No events found" }, {
      status: 404,
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  }

  const eventIndex = yearValue % dayEvents.length;
  const event = dayEvents[eventIndex] ?? dayEvents[0];
  const otherEvents = dayEvents.filter((_, index) => index !== eventIndex);
  const photographicEvents = otherEvents.filter((item) => /\.jpe?g(?:$|\?)/i.test(item.image_url));
  const candidates = photographicEvents.length >= 3 ? photographicEvents : otherEvents;
  const positions = [0, Math.floor((candidates.length - 1) / 3), candidates.length - 1];
  const relatedEvents = [...new Set(positions)]
    .map((index) => candidates[index])
    .filter((item): item is HistoryEvent => Boolean(item));

  return NextResponse.json({
    event,
    relatedEvents,
    monthShort: MONTHS[month - 1],
    day,
    todaySlug: dateKeyToSlug(dateKey),
  }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
