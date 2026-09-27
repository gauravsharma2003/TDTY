import type { Metadata } from "next";
import { cache } from "react";
import TDTYApp from "@/components/TDTYApp";
import type { HistoryEvent } from "@/lib/types";
import { formatYear } from "@/lib/format-year";
import { dateKeyToSlug } from "@/lib/date-slugs";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { getEventsForDate } from "@/lib/events-data";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// The homepage is visitor-timezone-specific, so it must be rendered per request
// instead of being shared from the ISR/Worker response cache.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const getTodayEvent = cache(async () => {
  let timeZone = "UTC";
  try {
    const { cf } = await getCloudflareContext({ async: true });
    if (typeof cf?.timezone === "string" && cf.timezone) timeZone = cf.timezone;
  } catch {
    // Local development or non-Cloudflare hosting falls back to UTC.
  }

  const now = new Date();
  const dateParts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const datePart = (type: string) => dateParts.find((part) => part.type === type)?.value ?? "0";
  const year = Number(datePart("year"));
  const mm = datePart("month");
  const dd = datePart("day");
  const dateKey = `${mm}-${dd}`;

  const dayEvents = await getEventsForDate(dateKey);

  const eventIndex = year % (dayEvents.length || 1);
  const event = dayEvents[eventIndex] ?? dayEvents[0];
  const otherEvents = dayEvents.filter((_, index) => index !== eventIndex);
  const photographicEvents = otherEvents.filter((item) => /\.jpe?g(?:$|\?)/i.test(item.image_url));
  const candidates = photographicEvents.length >= 3 ? photographicEvents : otherEvents;
  const positions = [0, Math.floor((candidates.length - 1) / 3), candidates.length - 1];
  const relatedEvents = [...new Set(positions)]
    .map((index) => candidates[index])
    .filter((item): item is HistoryEvent => Boolean(item));
  const monthLong = new Intl.DateTimeFormat("en-US", { timeZone, month: "long" }).format(now);
  const monthShort = new Intl.DateTimeFormat("en-US", { timeZone, month: "short" }).format(now).toUpperCase();
  const day = Number(dd);
  const dateString = `${monthLong} ${day}`;

  const todaySlug = dateKeyToSlug(dateKey);
  return { event, relatedEvents, monthShort, monthLong, day, dateString, todaySlug };
});

export async function generateMetadata(): Promise<Metadata> {
  const { event, dateString } = await getTodayEvent();
  if (!event) return {};

  const title = `Today in History: ${event.title} — This Day That Year`;
  const detail = event.subtitle.trim() === event.text.trim()
    ? event.text
    : `${event.subtitle} ${event.text}`;
  const description = `On ${dateString}, ${formatYear(event.year)}: ${detail.slice(0, 180)}`;
  const siteName = SITE_NAME;
  const siteUrl = SITE_URL;

  return {
    title,
    description,
    keywords: [
      "today in history",
      "this day in history",
      "on this day",
      "what happened today",
      "today in history facts",
      event.title,
      event.location,
      event.era,
      `${dateString} history`,
      `what happened on ${dateString}`,
      "historical events today",
      "history today",
      "this day that year",
    ],
    authors: [{ name: siteName }],
    creator: siteName,
    publisher: siteName,
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title,
      description,
      url: siteUrl,
      siteName,
      images: [
        {
          url: event.image_url,
          alt: event.title,
          width: 1200,
          height: 630,
        },
      ],
      type: "website",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [
        {
          url: event.image_url,
          alt: event.title,
        },
      ],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

function JsonLd({ event }: { event: HistoryEvent }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${SITE_URL}#homepage`,
    url: SITE_URL,
    name: `Today in History: ${event.title} — ${SITE_NAME}`,
    description: event.subtitle.trim() === event.text.trim()
      ? event.text.slice(0, 200)
      : `${event.subtitle} ${event.text.slice(0, 200)}`,
    inLanguage: "en",
    isPartOf: { "@id": `${SITE_URL}#website` },
    mainEntity: {
      "@type": "Thing",
      name: event.title,
      description: event.subtitle,
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default async function Home() {
  const { event, relatedEvents, monthShort, day, todaySlug } = await getTodayEvent();
  if (!event) return null;
  return (
    <>
      <JsonLd event={event} />
      <TDTYApp
        event={event}
        relatedEvents={relatedEvents}
        monthShort={monthShort}
        day={day}
        todaySlug={todaySlug}
      />
    </>
  );
}
