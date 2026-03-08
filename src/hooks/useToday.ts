"use client";
import { useState, useEffect } from "react";

export function useToday() {
  const [dateKey, setDateKey] = useState<string | null>(null);
  const [dateLabel, setDateLabel] = useState("");
  const [monthShort, setMonthShort] = useState("");
  const [day, setDay] = useState(0);
  const [eventIndex, setEventIndex] = useState(0);

  useEffect(() => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    setDateKey(`${mm}-${dd}`);
    setDateLabel(
      now.toLocaleDateString("en-US", { month: "long", day: "numeric" })
    );
    setMonthShort(
      now.toLocaleDateString("en-US", { month: "short" }).toUpperCase()
    );
    setDay(now.getDate());
    setEventIndex(now.getFullYear() % 3);
  }, []);

  return { dateKey, dateLabel, monthShort, day, eventIndex };
}
