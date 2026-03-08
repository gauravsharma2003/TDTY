"use client";
import { useCallback, useRef, useState } from "react";
import { HistoryEvent } from "@/lib/types";
import { yearDisplay } from "@/lib/format-year";
import styles from "./ShareButton.module.css";

interface Props {
  event: HistoryEvent;
  monthShort: string;
  day: number;
  revealed: boolean;
}

export default function ShareButton({
  event,
  monthShort,
  day,
  revealed,
}: Props) {
  const [tooltip, setTooltip] = useState<string | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showTooltip = useCallback((msg: string) => {
    clearTimeout(tooltipTimer.current);
    setTooltip(msg);
    tooltipTimer.current = setTimeout(() => setTooltip(null), 2000);
  }, []);

  const handleShare = useCallback(async () => {
    const yr = yearDisplay(event.year);
    const text = `${monthShort} ${day}, ${yr} — ${event.title}: ${event.subtitle}`;
    const url = window.location.href;

    try {
      if (navigator.share) {
        try {
          await navigator.share({ title: "This Day That Year", text, url });
          return;
        } catch (e: unknown) {
          if (e instanceof DOMException && e.name === "AbortError") return;
        }
      }

      await navigator.clipboard.writeText(url);
      showTooltip("Link copied!");
    } catch {
      showTooltip("Failed to copy");
    }
  }, [event, monthShort, day, showTooltip]);

  return (
    <div className={styles.shareWrap}>
      {tooltip && (
        <span className={styles.tooltip}>{tooltip}</span>
      )}
      <button
        className={styles.shareBtn}
        onClick={handleShare}
        aria-label="Share this event"
        title="Share"
        style={{
          opacity: revealed ? 1 : 0,
          transition: "opacity 1s ease 2.4s",
          pointerEvents: revealed ? "auto" : "none",
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(195, 155, 85, 0.5)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
      </button>
    </div>
  );
}
