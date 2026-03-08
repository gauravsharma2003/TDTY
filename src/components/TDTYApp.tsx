"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { HistoryEvent } from "@/lib/types";
import Header from "./Header";
import EventSlide from "./EventSlide";
import DustParticles from "./effects/DustParticles";
import ShareButton from "./ShareButton";
import styles from "./TDTYApp.module.css";

interface Props {
  event: HistoryEvent;
  monthShort: string;
  day: number;
}

export default function TDTYApp({ event, monthShort, day }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
  const [imgError, setImgError] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 500);
    return () => clearTimeout(t);
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return;
    setMouse({
      x: (e.clientX - r.left) / r.width,
      y: (e.clientY - r.top) / r.height,
    });
  }, []);

  useEffect(() => {
    const handler = (e: DeviceOrientationEvent) => {
      setMouse({
        x: Math.max(0, Math.min(1, 0.5 + (e.gamma || 0) / 50)),
        y: Math.max(0, Math.min(1, 0.5 + ((e.beta || 0) - 40) / 50)),
      });
    };
    window.addEventListener("deviceorientation", handler, true);
    return () => window.removeEventListener("deviceorientation", handler, true);
  }, []);

  const px = (mouse.x - 0.5) * 2;
  const py = (mouse.y - 0.5) * 2;
  const r = revealed;

  return (
    <div
      ref={wrapRef}
      className={styles.wrapper}
      onMouseMove={onMouseMove}
    >
      {/* L0: Void */}
      <div className={styles.void} />

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
              src={event.image_url}
              alt={event.title}
              className={styles.heroImg}
              style={{
                transform: `translate(${px * -14}px, ${py * -10}px)`,
              }}
              loading="eager"
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
      <EventSlide event={event} active={r} />

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
