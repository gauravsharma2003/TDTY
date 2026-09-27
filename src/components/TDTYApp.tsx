"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { HistoryEvent } from "@/lib/types";
import { yearDisplay } from "@/lib/format-year";
import ShareButton from "./ShareButton";
import WikimediaCredit from "./WikimediaCredit";
import styles from "./TDTYApp.module.css";

interface Props {
  event: HistoryEvent;
  relatedEvents: HistoryEvent[];
  monthShort: string;
  day: number;
  todaySlug: string;
  dateKey: string;
  year: number;
}

function EventImage({ event, className, eager = false }: {
  event: HistoryEvent;
  className: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (failed || !event.image_url) {
    return <div className={styles.imageFallback} role="img" aria-label={event.title} />;
  }
  return (
    <img
      className={className}
      src={event.image_url}
      alt={event.title}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : undefined}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

export default function TDTYApp({ event, relatedEvents, monthShort, day, todaySlug, dateKey, year }: Props) {
  const [today, setToday] = useState({ event, relatedEvents, monthShort, day, todaySlug });

  useEffect(() => {
    let active = true;
    let midnightTimer: ReturnType<typeof setTimeout>;
    let loadedDate = `${year}-${dateKey}`;

    const updateForLocalDate = async () => {
      const now = new Date();
      const localDateKey = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const requestedDate = `${now.getFullYear()}-${localDateKey}`;

      // Revalidate at local midnight, and on return to a backgrounded tab.
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
      midnightTimer = setTimeout(() => { void updateForLocalDate(); }, Math.max(1000, nextMidnight - now.getTime() + 100));

      if (requestedDate === loadedDate) return;
      try {
        const response = await fetch(`/api/today?date=${localDateKey}&year=${now.getFullYear()}`, { cache: "no-store" });
        if (!response.ok) return;
        const result = await response.json();
        if (active) {
          setToday(result);
          loadedDate = requestedDate;
        }
      } catch {
        // Keep the server-rendered story if the local-date lookup is unavailable.
      }
    };

    const refresh = () => {
      clearTimeout(midnightTimer);
      void updateForLocalDate();
    };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      active = false;
      clearTimeout(midnightTimer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [dateKey, year]);

  useEffect(() => {
    document.title = `Today in History: ${today.event.title} — This Day That Year`;
  }, [today.event.title]);

  const dateLabel = `${today.monthShort} ${today.day}`;
  const summary = today.event.subtitle?.trim() || today.event.text?.trim();
  const dayHref = `/on-this-day/${today.todaySlug}`;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.wordmark} href="/" aria-label="This Day That Year, home">
          This Day That Year
        </Link>
        <nav className={styles.navigation} aria-label="Main navigation">
          <Link href="/" aria-current="page">Today</Link>
          <Link href="/on-this-day">Browse dates</Link>
        </nav>
        <ShareButton event={today.event} monthShort={today.monthShort} day={today.day} />
      </header>

      <section className={styles.feature} aria-labelledby="featured-title">
        <figure className={styles.featureImage}>
          <EventImage event={today.event} className={styles.heroImg} eager />
          <WikimediaCredit event={today.event} className={styles.imageCredit} />
        </figure>
        <div className={styles.featureContent}>
          <div className={styles.featureContentInner}>
            <p className={styles.date}>{dateLabel}</p>
            <span className={styles.year}>{yearDisplay(today.event.year)}</span>
            <h1 id="featured-title" className={styles.title}>{today.event.title}</h1>
            {summary && <p className={styles.summary}>{summary}</p>}
            <Link className={styles.exploreLink} href={dayHref}>
              Explore this day <span aria-hidden="true">→</span>
            </Link>
            {today.event.sources?.length ? (
              <p className={styles.sources}>
                Sources: {today.event.sources.map((source, index) => (
                  <span key={source.url}>
                    {index > 0 ? ", " : ""}
                    <a href={source.url} target="_blank" rel="noopener noreferrer">
                      {source.label}
                    </a>
                  </span>
                ))}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {today.relatedEvents.length > 0 && (
        <section className={styles.timeline} aria-labelledby="timeline-title">
          <div className={styles.timelineHeading}>
            <h2 id="timeline-title">Other moments on {dateLabel}</h2>
            <span aria-hidden="true" />
          </div>
          <div className={styles.timelineList}>
            {today.relatedEvents.map((related) => (
              <Link
                className={styles.timelineItem}
                href={`${dayHref}#event-${related.year}`}
                key={`${related.year}-${related.title}`}
              >
                <span className={styles.timelineYear}>{yearDisplay(related.year)}</span>
                <div className={styles.timelineStory}>
                  <h3>{related.title}</h3>
                  <figure className={styles.timelineImage}>
                    <EventImage event={related} className={styles.timelineImg} />
                    <WikimediaCredit event={related} className={styles.timelineCredit} />
                  </figure>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
