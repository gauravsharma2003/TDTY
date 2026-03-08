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

  const title = `${event.title} — This Day That Year`;
  const description = `On ${dateString}, ${formatYear(event.year)}: ${event.subtitle}. ${event.text.slice(0, 150)}...`;
  const siteName = "This Day That Year";
  const siteUrl = "https://tdty.vercel.app";

  return {
    title,
    description,
    keywords: [
      "this day in history",
      "on this day",
      "today in history",
      event.title,
      event.location,
      event.era,
      `${dateString} history`,
      "historical events",
      "history today",
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
        },
      ],
      type: "article",
      publishedTime: new Date().toISOString(),
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

function JsonLd({ event, dateString }: { event: HistoryEvent; dateString: string }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: event.title,
    description: event.subtitle,
    articleBody: event.text,
    image: event.image_url,
    datePublished: new Date().toISOString(),
    dateModified: new Date().toISOString(),
    author: {
      "@type": "Organization",
      name: "This Day That Year",
      url: "https://tdty.vercel.app",
    },
    publisher: {
      "@type": "Organization",
      name: "This Day That Year",
      url: "https://tdty.vercel.app",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": "https://tdty.vercel.app",
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
    keywords: `this day in history, ${dateString}, ${event.title}, ${event.location}`,
  };

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
      <JsonLd event={event} dateString={dateString} />
      <TDTYApp event={event} monthShort={monthShort} day={day} todaySlug={todaySlug} />
    </>
  );
}
