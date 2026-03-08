import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { HistoryEvent } from "@/lib/types";
import { formatYear } from "@/lib/format-year";
import { getAllSlugs, slugToDateKey, getAdjacentSlugs, slugToDisplayDate } from "@/lib/date-slugs";
import { encodeEvents } from "@/lib/obfuscate";
import DayPageContent from "@/components/DayPageContent";

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

function getEventsForSlug(slug: string): HistoryEvent[] {
  const dateKey = slugToDateKey(slug);
  if (!dateKey) return [];
  const filePath = path.join(process.cwd(), "public", "data", `${dateKey}.json`);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }
  const all = JSON.parse(fs.readFileSync(path.join(process.cwd(), "events.json"), "utf-8"));
  return all[dateKey] || [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const events = getEventsForSlug(slug);
  if (!events.length) return {};
  const displayDate = slugToDisplayDate(slug);
  const title = `On ${displayDate} in History | This Day That Year`;
  const desc = events
    .slice(0, 3)
    .map((e) => `${e.title} (${formatYear(e.year)})`)
    .join(", ");
  const description = `Discover what happened on ${displayDate}: ${desc}`;
  const siteUrl = "https://tdty.vercel.app";

  return {
    title,
    description,
    keywords: [
      `${displayDate} in history`,
      "on this day",
      "today in history",
      ...events.slice(0, 3).map((e) => e.title),
      "historical events",
    ],
    alternates: { canonical: `/on-this-day/${slug}` },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/on-this-day/${slug}`,
      siteName: "This Day That Year",
      images: [{ url: events[0].image_url, alt: events[0].title }],
      type: "article",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: events[0].image_url, alt: events[0].title }],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export default async function DayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dateKey = slugToDateKey(slug);
  if (!dateKey) notFound();

  const events = getEventsForSlug(slug);
  if (!events.length) notFound();

  const top3 = events.slice(0, 3);
  const displayDate = slugToDisplayDate(slug);
  const { prev, next } = getAdjacentSlugs(slug);
  const encoded = encodeEvents(top3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Historical events on ${displayDate}`,
    numberOfItems: top3.length,
    itemListElement: top3.map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Article",
        headline: e.title,
        description: e.subtitle,
        image: e.image_url,
        datePublished: formatYear(e.year),
        author: { "@type": "Organization", name: "This Day That Year" },
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <noscript>
        <div style={{ padding: "2rem", color: "#fff", background: "#050403" }}>
          <h1>On {displayDate} in History</h1>
          {top3.map((e, i) => (
            <section key={i}>
              <h2>{e.title} — {formatYear(e.year)}</h2>
              <p>{e.subtitle}</p>
            </section>
          ))}
        </div>
      </noscript>
      <DayPageContent
        _d={encoded}
        slug={slug}
        displayDate={displayDate}
        prevSlug={prev}
        nextSlug={next}
      />
    </>
  );
}
