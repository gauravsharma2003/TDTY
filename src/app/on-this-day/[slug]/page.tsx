import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { HistoryEvent } from "@/lib/types";
import { formatYear } from "@/lib/format-year";
import { getAllSlugs, slugToDateKey, getAdjacentSlugs, slugToDisplayDate } from "@/lib/date-slugs";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import DayPageContent from "@/components/DayPageContent";
import { getEventsForDate } from "@/lib/events-data";

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

async function getEventsForSlug(slug: string): Promise<HistoryEvent[]> {
  const dateKey = slugToDateKey(slug);
  if (!dateKey) return [];
  return getEventsForDate(dateKey);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const events = await getEventsForSlug(slug);
  if (!events.length) return {};
  const displayDate = slugToDisplayDate(slug);
  const title = `What Happened on ${displayDate}? | This Day That Year`;
  const desc = events
    .slice(0, 3)
    .map((e) => `${e.title} (${formatYear(e.year)})`)
    .join(". ");
  const description = `On ${displayDate} in history: ${desc}. Explore major historical events with immersive visuals.`;
  const siteUrl = SITE_URL;

  return {
    title,
    description,
    keywords: [
      `what happened on ${displayDate}`,
      `${displayDate} in history`,
      `${displayDate} historical events`,
      "on this day",
      "today in history",
      ...events.slice(0, 3).map((e) => e.title),
      ...events.slice(0, 3).map((e) => e.location),
      "historical events",
      "this day that year",
    ],
    alternates: { canonical: `/on-this-day/${slug}` },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/on-this-day/${slug}`,
    siteName: SITE_NAME,
      images: [{ url: events[0].image_url, alt: events[0].title, width: 1200, height: 630 }],
      type: "website",
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
        "max-video-preview": -1,
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

  const events = await getEventsForSlug(slug);
  if (!events.length) notFound();

  const top3 = events.slice(0, 3);
  const displayDate = slugToDisplayDate(slug);
  const { prev, next } = getAdjacentSlugs(slug);

  const siteUrl = SITE_URL;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${siteUrl}/on-this-day/${slug}#page`,
      url: `${siteUrl}/on-this-day/${slug}`,
      name: `Historical events on ${displayDate}`,
      description: `Major events that happened on ${displayDate} throughout history`,
      isPartOf: { "@id": `${siteUrl}#website` },
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: top3.length,
        itemListElement: top3.map((event, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "Thing",
            name: event.title,
            description: event.subtitle,
          },
        })),
      },
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
          name: displayDate,
          item: `${siteUrl}/on-this-day/${slug}`,
        },
      ],
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DayPageContent
        events={top3}
        slug={slug}
        displayDate={displayDate}
        prevSlug={prev}
        nextSlug={next}
      />
    </>
  );
}
