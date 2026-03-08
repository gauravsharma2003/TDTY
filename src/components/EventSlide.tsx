"use client";
import { HistoryEvent } from "@/lib/types";
import { formatYear, yearDisplay } from "@/lib/format-year";
import styles from "./EventSlide.module.css";

interface Props {
  event: HistoryEvent;
  active: boolean;
}

export default function EventSlide({ event, active }: Props) {
  const a = active;

  const tY = (delay: number, y = 20, blur = 2) => ({
    opacity: a ? 1 : 0,
    transform: a ? "translateY(0)" : `translateY(${y}px)`,
    filter: a ? "blur(0px)" : `blur(${blur}px)`,
    transition: a
      ? `all 1s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s`
      : "all 0.4s ease 0s",
  });

  const tX = (delay: number, x = -14) => ({
    opacity: a ? 1 : 0,
    transform: a ? "translateX(0)" : `translateX(${x}px)`,
    transition: a
      ? `all 0.9s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s`
      : "all 0.3s ease 0s",
  });

  return (
    <div
      className={styles.slide}
      style={{ pointerEvents: a ? "auto" : "none" }}
    >
      {/* Side era label */}
      <div
        className={styles.eraLabel}
        style={{
          opacity: a ? 1 : 0,
          transition: a ? "opacity 1.2s ease 2.0s" : "opacity 0.3s ease 0s",
        }}
      >
        <span className={styles.eraText}>
          {event.era} &middot; {formatYear(event.year)}
        </span>
      </div>

      {/* Bottom content */}
      <div className={styles.bottom}>
        {/* Location */}
        <div style={tX(0.4)}>
          <div className={styles.location}>
            <svg
              width="9"
              height="9"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(195,155,85,0.65)"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{event.location}</span>
          </div>
        </div>

        {/* Year */}
        <div>
          <span
            className={styles.year}
            style={{
              opacity: a ? 1 : 0,
              transform: a ? "translateY(0)" : "translateY(55px)",
              letterSpacing: a ? "-0.045em" : "0.12em",
              filter: a ? "blur(0)" : "blur(6px)",
              transition: a
                ? "all 1.1s cubic-bezier(0.22, 1, 0.36, 1) 0.6s"
                : "all 0.4s ease 0s",
            }}
          >
            {yearDisplay(event.year)}
          </span>
        </div>

        {/* Accent line */}
        <div
          className={styles.accentLine}
          style={{
            transform: a ? "scaleX(1)" : "scaleX(0)",
            transition: a
              ? "transform 0.9s cubic-bezier(0.22, 1, 0.36, 1) 1.0s"
              : "transform 0.3s ease 0s",
          }}
        />

        {/* Title */}
        <h1 className={styles.title} style={tY(1.1, 30, 4)}>
          {event.title}
        </h1>

        {/* Subtitle */}
        <p className={styles.subtitle} style={tX(1.3)}>
          {event.subtitle}
        </p>

        {/* Body */}
        <p className={styles.body} style={tY(1.5, 24, 2)}>
          {event.text}
        </p>

        {/* Bottom rule */}
        <div
          className={styles.bottomRule}
          style={{
            opacity: a ? 1 : 0,
            transition: a ? "opacity 1.2s ease 1.8s" : "opacity 0.3s ease 0s",
          }}
        >
          <div className={styles.ruleLine} />
        </div>
      </div>
    </div>
  );
}
