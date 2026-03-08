import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import TDTYApp from "@/components/TDTYApp";
import { HistoryEvent } from "@/lib/types";
import { formatYear } from "@/lib/format-year";
import { dateKeyToSlug } from "@/lib/date-slugs";

export const revalidate = 3600;

function getTodayEvent() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const dateKey = `${mm}-${dd}`;

  const filePath = path.join(process.cwd(), "public", "data", `${dateKey}.json`);
  const dayEvents: HistoryEvent[] = fs.existsSync(filePath)
    ? JSON.parse(fs.readFileSync(filePath, "utf-8"))
    : JSON.parse(fs.readFileSync(path.join(process.cwd(), "events.json"), "utf-8"))[dateKey] || [];

  const eventIndex = now.getFullYear() % (dayEvents.length || 1);
  const event = dayEvents[eventIndex] ?? dayEvents[0];
  const monthLong = now.toLocaleDateString("en-US", { month: "long" });
  const monthShort = now.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const day = now.getDate();
  const dateString = `${monthLong} ${day}`;

  const todaySlug = dateKeyToSlug(dateKey);
  return { event, monthShort, monthLong, day, dateString, todaySlug };
}

export async function generateMetadata(): Promise<Metadata> {
  const { event, dateString } = getTodayEvent();
  if (!event) return {};

  const title = `Today in History: ${event.title} — This Day That Year`;
  const description = `On ${dateString}, ${formatYear(event.year)}: ${event.subtitle}. ${event.text.slice(0, 140)}`;
  const siteName = "This Day That Year";
  const siteUrl = "https://tdty.vercel.app";

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

function JsonLd({ event, dateString, todaySlug }: { event: HistoryEvent; dateString: string; todaySlug: string }) {
  const siteUrl = "https://tdty.vercel.app";
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: `Today in History: ${event.title}`,
      description: `${event.subtitle}. ${event.text.slice(0, 200)}`,
      articleBody: event.text,
      image: event.image_url,
      author: {
        "@type": "Organization",
        name: "This Day That Year",
        url: siteUrl,
      },
      publisher: {
        "@type": "Organization",
        name: "This Day That Year",
        url: siteUrl,
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": siteUrl,
      },
      about: {
        "@type": "Event",
        name: event.title,
        description: event.subtitle,
        location: {
          "@type": "Place",
          name: event.location,
        },
        startDate: formatYear(event.year),
      },
      keywords: `today in history, this day in history, ${dateString}, ${event.title}, ${event.location}`,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: siteUrl,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "On This Day",
          item: `${siteUrl}/on-this-day`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: dateString,
          item: `${siteUrl}/on-this-day/${todaySlug}`,
        },
      ],
    },
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default function Home() {
  const { event, monthShort, day, dateString, todaySlug } = getTodayEvent();
  if (!event) return null;
  return (
    <>
      <JsonLd event={event} dateString={dateString} todaySlug={todaySlug} />
      <h1
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: 0,
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        Today in History: {event.title} — {dateString}, {formatYear(event.year)}
      </h1>
      <TDTYApp event={event} monthShort={monthShort} day={day} todaySlug={todaySlug} />
    </>
  );
}
