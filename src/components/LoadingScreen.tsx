"use client";
import styles from "./LoadingScreen.module.css";

export default function LoadingScreen() {
  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <div className={styles.labelRow}>
          <div className={styles.dot} />
          <span className={styles.label}>This Day That Year</span>
        </div>
        <div className={styles.dots}>
          <span className={styles.loadDot} />
          <span className={styles.loadDot} />
          <span className={styles.loadDot} />
        </div>
      </div>
    </div>
  );
}
