"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { HistoryEvent } from "@/lib/types";
import Header from "./Header";
import EventSlide from "./EventSlide";
import styles from "./TDTYApp.module.css";

const DustParticles = dynamic(() => import("./effects/DustParticles"), { ssr: false });
const ShareButton = dynamic(() => import("./ShareButton"), { ssr: false });

interface Props {
  event: HistoryEvent;
  monthShort: string;
  day: number;
}

export default function TDTYApp({ event, monthShort, day }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [imgError, setImgError] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 500);
    return () => clearTimeout(t);
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r || !heroRef.current) return;
    const mx = (e.clientX - r.left) / r.width;
    const my = (e.clientY - r.top) / r.height;
    const px = (mx - 0.5) * 2;
    const py = (my - 0.5) * 2;
    heroRef.current.style.transform = `translate(${px * -14}px, ${py * -10}px)`;
  }, []);

  useEffect(() => {
    const handler = (e: DeviceOrientationEvent) => {
      if (!heroRef.current) return;
      const mx = Math.max(0, Math.min(1, 0.5 + (e.gamma || 0) / 50));
      const my = Math.max(0, Math.min(1, 0.5 + ((e.beta || 0) - 40) / 50));
      const px = (mx - 0.5) * 2;
      const py = (my - 0.5) * 2;
      heroRef.current.style.transform = `translate(${px * -14}px, ${py * -10}px)`;
    };
    window.addEventListener("deviceorientation", handler, { passive: true, capture: true });
    return () => window.removeEventListener("deviceorientation", handler, true);
  }, []);

  const r = revealed;

  return (
    <div
      ref={wrapRef}
      className={styles.wrapper}
      onMouseMove={onMouseMove}
    >
      {/* L1: Background image */}
      <div className={styles.imageLayer}>
        {imgError ? (
          <div className={styles.imageFallback} />
        ) : (
          <>
            <img
              src={event.image_url}
              alt=""
              className={styles.imgBlurFill}
              aria-hidden="true"
              decoding="async"
            />
            <img
              ref={heroRef}
              src={event.image_url}
              alt={event.title}
              className={styles.heroImg}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              onError={() => setImgError(true)}
            />
          </>
        )}
      </div>

      {/* L2: Depth overlay */}
      <div className={styles.depthOverlay} />

      {/* L3: Ambient glow */}
      <div className={styles.ambientGlow} />

      {/* L4: Vignette */}
      <div className={styles.vignette} />

      {/* L7: Dust */}
      <DustParticles />

      {/* L8: Museum frame */}
      <div
        className={styles.museumFrame}
        style={{ opacity: r ? 1 : 0 }}
      />

      {/* L10: Header */}
      <Header
        monthShort={monthShort}
        day={day}
        revealed={r}
      />

      {/* L10: Event content */}
      <main>
        <EventSlide event={event} active={r} />
      </main>

      {/* L11: Corner marks */}
      <div
        className={styles.cornerMarks}
        style={{ opacity: r ? 1 : 0 }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`${styles.corner} ${styles[`c${i}`]}`}
          />
        ))}
      </div>

      {/* L12: Share button */}
      <ShareButton event={event} monthShort={monthShort} day={day} revealed={r} />
    </div>
  );
}
