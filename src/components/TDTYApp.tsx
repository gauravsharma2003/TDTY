"use client";

import { useState } from "react";
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

export default function TDTYApp({ event, relatedEvents, monthShort, day, todaySlug }: Props) {
  const dateLabel = `${monthShort} ${day}`;
  const summary = event.subtitle?.trim() || event.text?.trim();
  const dayHref = `/on-this-day/${todaySlug}`;

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
        <ShareButton event={event} monthShort={monthShort} day={day} />
      </header>

      <section className={styles.feature} aria-labelledby="featured-title">
        <figure className={styles.featureImage}>
          <EventImage event={event} className={styles.heroImg} eager />
          <WikimediaCredit event={event} className={styles.imageCredit} />
        </figure>
        <div className={styles.featureContent}>
          <div className={styles.featureContentInner}>
            <p className={styles.date}>{dateLabel}</p>
            <span className={styles.year}>{yearDisplay(event.year)}</span>
            <h1 id="featured-title" className={styles.title}>{event.title}</h1>
            {summary && <p className={styles.summary}>{summary}</p>}
            <Link className={styles.exploreLink} href={dayHref}>
              Explore this day <span aria-hidden="true">→</span>
            </Link>
            {event.sources?.length ? (
              <p className={styles.sources}>
                Sources: {event.sources.map((source, index) => (
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

      {relatedEvents.length > 0 && (
        <section className={styles.timeline} aria-labelledby="timeline-title">
          <div className={styles.timelineHeading}>
            <h2 id="timeline-title">Other moments on {dateLabel}</h2>
            <span aria-hidden="true" />
          </div>
          <div className={styles.timelineList}>
            {relatedEvents.map((related) => (
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
