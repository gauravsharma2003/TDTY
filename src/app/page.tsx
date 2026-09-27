import type { Metadata } from "next";
import TDTYApp from "@/components/TDTYApp";
import type { HistoryEvent } from "@/lib/types";
import { formatYear } from "@/lib/format-year";
import { dateKeyToSlug } from "@/lib/date-slugs";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { getEventsForDate } from "@/lib/events-data";

export const revalidate = 3600;

async function getTodayEvent() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const dateKey = `${mm}-${dd}`;

  const dayEvents = await getEventsForDate(dateKey);

  const eventIndex = now.getFullYear() % (dayEvents.length || 1);
  const event = dayEvents[eventIndex] ?? dayEvents[0];
  const otherEvents = dayEvents.filter((_, index) => index !== eventIndex);
  const photographicEvents = otherEvents.filter((item) => /\.jpe?g(?:$|\?)/i.test(item.image_url));
  const candidates = photographicEvents.length >= 3 ? photographicEvents : otherEvents;
  const positions = [0, Math.floor((candidates.length - 1) / 3), candidates.length - 1];
  const relatedEvents = [...new Set(positions)]
    .map((index) => candidates[index])
    .filter((item): item is HistoryEvent => Boolean(item));
  const monthLong = now.toLocaleDateString("en-US", { month: "long" });
  const monthShort = now.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const day = now.getDate();
  const dateString = `${monthLong} ${day}`;

  const todaySlug = dateKeyToSlug(dateKey);
  return { event, relatedEvents, monthShort, monthLong, day, dateString, todaySlug, dateKey, year: now.getFullYear() };
}

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
  const { event, relatedEvents, monthShort, day, todaySlug, dateKey, year } = await getTodayEvent();
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
        dateKey={dateKey}
        year={year}
      />
    </>
  );
}
