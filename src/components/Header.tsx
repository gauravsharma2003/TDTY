"use client";
import styles from "./Header.module.css";

interface Props {
  monthShort: string;
  day: number;
  revealed: boolean;
}

export default function Header({ monthShort, day, revealed }: Props) {
  const r = revealed;

  return (
    <div className={styles.header}>
      <div
        style={{
          opacity: r ? 1 : 0,
          transform: r ? "translateY(0)" : "translateY(-18px)",
          transition: "all 1s cubic-bezier(0.22,1,0.36,1) 0.8s",
        }}
      >
        <div className={styles.labelRow}>
          <div
            className={styles.dot}
            style={{
              animation: r ? "dotPulse 3s ease-in-out infinite" : "none",
            }}
          />
          <span className={styles.label}>This Day That Year</span>
        </div>
      </div>

      <div
        className={styles.right}
        style={{
          opacity: r ? 1 : 0,
          transform: r ? "translateY(0)" : "translateY(-18px)",
          transition: "all 1s cubic-bezier(0.22,1,0.36,1) 1.0s",
        }}
      >
        <span className={styles.monthShort}>{monthShort}</span>
        <span className={styles.dayBig}>{day}</span>
      </div>
    </div>
  );
}
