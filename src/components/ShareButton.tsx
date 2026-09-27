"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { HistoryEvent } from "@/lib/types";
import { yearDisplay } from "@/lib/format-year";
import styles from "./ShareButton.module.css";

interface Props {
  event: HistoryEvent;
  monthShort: string;
  day: number;
}

export default function ShareButton({ event, monthShort, day }: Props) {
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const showMessage = useCallback((value: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(value);
    timer.current = setTimeout(() => setMessage(""), 2400);
  }, []);

  const handleShare = useCallback(async () => {
    const text = `${monthShort} ${day}, ${yearDisplay(event.year)} — ${event.title}: ${event.subtitle}`;
    const url = window.location.href;

    if (navigator.share) {
      try {
        showMessage("Opening share options");
        await navigator.share({ title: event.title, text, url });
        showMessage("Shared");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          setMessage("");
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      showMessage("Link copied");
    } catch {
      showMessage("Could not copy link");
    }
  }, [day, event, monthShort, showMessage]);

  return (
    <div className={styles.shareWrap}>
      <button className={styles.shareBtn} type="button" onClick={handleShare} aria-label="Share this story">
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" />
          <path d="M12 15V3m0 0L8 7m4-4 4 4" />
        </svg>
        <span>Share<span className={styles.storyWord}> story</span></span>
      </button>
      <span className={styles.status} role="status" aria-live="polite">{message}</span>
    </div>
  );
}
