"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { HistoryEvent } from "@/lib/types";
import { formatYear, yearDisplay } from "@/lib/format-year";
import styles from "./DayPageContent.module.css";

interface Props {
  events: HistoryEvent[];
  slug: string;
  displayDate: string;
  prevSlug: string;
  nextSlug: string;
}

function slugToDisplay(slug: string): string {
  const match = slug.match(/^([a-z]+)-(\d+)$/);
  if (!match) return slug;
  return `${match[1].charAt(0).toUpperCase() + match[1].slice(1)} ${match[2]}`;
}

function EventCard({ event, index }: { event: HistoryEvent; index: number }) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <article
      ref={ref}
      className={styles.card}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(40px)",
        transition: `all 0.8s cubic-bezier(0.22, 1, 0.36, 1) ${index * 0.15}s`,
      }}
    >
      <div className={styles.cardImage}>
        <img
          src={event.image_url}
          alt={`${event.title} — ${event.subtitle}`}
          loading={index === 0 ? "eager" : "lazy"}
          decoding="async"
          width={800}
          height={450}
        />
        <div className={styles.cardImageOverlay} />
      </div>

      <div className={styles.cardBody}>
        <div className={styles.cardMeta}>
          <span className={styles.cardLocation}>{event.location}</span>
          <span className={styles.cardEra}>{event.era}</span>
        </div>

        <span className={styles.cardYear}>{yearDisplay(event.year)}</span>

        <div className={styles.cardAccent} />

        <h2 className={styles.cardTitle}>{event.title}</h2>
        <p className={styles.cardSubtitle}>{event.subtitle}</p>
        <p className={styles.cardText}>{event.text}</p>

        <div className={styles.cardYearLabel}>{formatYear(event.year)}</div>
      </div>
    </article>
  );
}

export default function DayPageContent({ events, displayDate, prevSlug, nextSlug }: Props) {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href="/on-this-day">On This Day</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{displayDate}</span>
        </nav>
        <Link href="/" className={styles.homeLink}>
          <span className={styles.dot} />
          This Day That Year
        </Link>
        <h1 className={styles.dateHeading}>{displayDate}</h1>
        <p className={styles.dateSubtext}>in History</p>
      </header>

      <section className={styles.events} aria-label={`Historical events on ${displayDate}`}>
        {events.length === 0 ? (
          <p className={styles.empty}>No events found for this day.</p>
        ) : (
          events.map((event, i) => (
            <EventCard key={i} event={event} index={i} />
          ))
        )}
      </section>

      <nav className={styles.nav} aria-label="Day navigation">
        <Link href={`/on-this-day/${prevSlug}`} className={styles.navLink}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          {slugToDisplay(prevSlug)}
        </Link>
        <Link href="/" className={styles.navHome}>
          Today
        </Link>
        <Link href={`/on-this-day/${nextSlug}`} className={styles.navLink}>
          {slugToDisplay(nextSlug)}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </nav>

      <footer className={styles.footer}>
        <p>Explore history, one day at a time.</p>
      </footer>
    </main>
  );
}
