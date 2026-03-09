import type { Metadata } from "next";
import Link from "next/link";
import { getAllSlugs, slugToDisplayDate } from "@/lib/date-slugs";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const metadata: Metadata = {
  title: "On This Day in History — Every Day of the Year | This Day That Year",
  description:
    "Browse historical events for every day of the year. 366 days of history with major events, immersive images, and fascinating stories from the past.",
  keywords: [
    "on this day in history",
    "today in history",
    "what happened today",
    "historical events by date",
    "this day that year",
    "history calendar",
    "daily history",
    "every day in history",
  ],
  alternates: { canonical: "/on-this-day" },
  openGraph: {
    title: "On This Day in History — Every Day of the Year",
    description:
      "Browse 366 days of history. Discover major events that happened on every day of the year.",
    url: "https://thisyearthatday.vercel.app/on-this-day",
    siteName: "This Day That Year",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "On This Day in History — Every Day of the Year",
    description:
      "Browse 366 days of history. Discover major events that happened on every day of the year.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
    },
  },
};

function groupByMonth(slugs: string[]) {
  const months: { name: string; slugs: { slug: string; display: string }[] }[] = [];
  let current: { name: string; slugs: { slug: string; display: string }[] } | null = null;

  for (const slug of slugs) {
    const display = slugToDisplayDate(slug);
    const monthName = display.split(" ")[0];
    if (!current || current.name !== monthName) {
      current = { name: monthName, slugs: [] };
      months.push(current);
    }
    current.slugs.push({ slug, display });
  }
  return months;
}

export default function OnThisDayIndex() {
  const allSlugs = getAllSlugs();
  const months = groupByMonth(allSlugs);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "On This Day in History",
    description: "Browse historical events for every day of the year",
    url: "https://thisyearthatday.vercel.app/on-this-day",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: 366,
      itemListElement: MONTH_NAMES.map((m, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: m,
        url: `https://thisyearthatday.vercel.app/on-this-day#${m.toLowerCase()}`,
      })),
    },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://thisyearthatday.vercel.app" },
        { "@type": "ListItem", position: 2, name: "On This Day", item: "https://thisyearthatday.vercel.app/on-this-day" },
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main
        style={{
          minHeight: "100vh",
          background: "#050403",
          color: "#fff",
          padding: "0 clamp(16px, 5vw, 80px)",
        }}
      >
        <header style={{ textAlign: "center", padding: "clamp(48px, 8vh, 96px) 0 clamp(24px, 3vh, 40px)" }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.3em",
              textTransform: "uppercase" as const,
              color: "rgba(195, 155, 85, 0.6)",
              textDecoration: "none",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#c9a44e",
                display: "inline-block",
              }}
            />
            This Day That Year
          </Link>
          <h1
            style={{
              fontSize: "clamp(36px, 8vw, 72px)",
              fontWeight: 800,
              lineHeight: 1.3,
              marginTop: "clamp(16px, 3vh, 32px)",
              paddingBottom: "0.15em",
              background: "linear-gradient(155deg, #fff 10%, rgba(220, 185, 110, 0.85) 90%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              WebkitBoxDecorationBreak: "clone" as const,
              boxDecorationBreak: "clone" as const,
            }}
          >
            On This Day in History
          </h1>
          <p
            style={{
              fontSize: "clamp(14px, 2vw, 18px)",
              color: "rgba(195, 155, 85, 0.5)",
              fontStyle: "italic",
              marginTop: "8px",
              maxWidth: "540px",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Explore major historical events for every day of the year
          </p>
        </header>

        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          {months.map((month) => (
            <section
              key={month.name}
              id={month.name.toLowerCase()}
              style={{ marginBottom: "clamp(40px, 5vh, 64px)" }}
            >
              <h2
                style={{
                  fontSize: "clamp(20px, 3vw, 28px)",
                  fontWeight: 700,
                  color: "rgb(195, 165, 100)",
                  marginBottom: "clamp(12px, 2vh, 20px)",
                  borderBottom: "1px solid rgba(195, 155, 85, 0.1)",
                  paddingBottom: "8px",
                }}
              >
                {month.name}
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                  gap: "8px",
                }}
              >
                {month.slugs.map(({ slug, display }) => (
                  <Link
                    key={slug}
                    href={`/on-this-day/${slug}`}
                    style={{
                      display: "block",
                      padding: "10px 12px",
                      fontSize: "14px",
                      color: "rgba(255, 255, 255, 0.7)",
                      textDecoration: "none",
                      borderRadius: "4px",
                      border: "1px solid rgba(195, 155, 85, 0.08)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {display}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>

        <nav
          style={{
            maxWidth: "900px",
            margin: "0 auto",
            textAlign: "center",
            padding: "clamp(24px, 3vh, 40px) 0",
            borderTop: "1px solid rgba(195, 155, 85, 0.1)",
          }}
        >
          <Link
            href="/"
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "rgba(195, 155, 85, 0.6)",
              textDecoration: "none",
            }}
          >
            ← Back to Today
          </Link>
        </nav>

        <footer
          style={{
            textAlign: "center",
            padding: "clamp(16px, 2vh, 24px) 0 clamp(32px, 5vh, 64px)",
            fontSize: "12px",
            color: "rgba(255, 255, 255, 0.15)",
            fontStyle: "italic",
          }}
        >
          <p>Explore history, one day at a time.</p>
        </footer>
      </main>
    </>
  );
}
