"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getTodayDateString } from "@/lib/daily/streak";
import { getCompletedDailyDates } from "@/lib/client/storage";
import { DoodleButton } from "@/components/doodle/DoodleButton";
import { DoodleIcon } from "@/components/doodle/DoodleIcon";

export default function ArchivePage() {
  const todayStr = getTodayDateString();
  const [currentYear, setCurrentYear] = useState<number>(() => parseInt(todayStr.split("-")[0], 10));
  const [currentMonth, setCurrentMonth] = useState<number>(() => parseInt(todayStr.split("-")[1], 10));
  const [completedDates, setCompletedDates] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Load completed dates from client storage first
    const clientCompleted = getCompletedDailyDates();
    setCompletedDates(clientCompleted);

    // Fetch from archive API for server-synced completions
    const fetchArchive = async () => {
      try {
        const res = await fetch(`/api/archive?year=${currentYear}&month=${currentMonth}`);
        if (res.ok) {
          const data = await res.json();
          if (data.completedDates && Array.isArray(data.completedDates)) {
            const merged = Array.from(new Set([...clientCompleted, ...data.completedDates]));
            setCompletedDates(merged);
          }
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    };

    fetchArchive();
  }, [currentYear, currentMonth]);

  const monthNames = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december"
  ];

  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay();
  // Adjust so Monday = 0, Sunday = 6
  const startDay = (firstDayOfMonth + 6) % 7;
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    const nextDate = new Date(currentYear, currentMonth, 1);
    const today = new Date();
    if (nextDate > today) return; // Cannot view future months

    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const canGoNext = !(currentYear === parseInt(todayStr.split("-")[0], 10) && currentMonth === parseInt(todayStr.split("-")[1], 10));

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "var(--page-reading, 520px)",
        margin: "12px auto",
        padding: "16px 20px 48px",
        boxSizing: "border-box",
        fontFamily: "var(--font-doodle)",
      }}
    >
      {/* Month & Navigation */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <DoodleButton
          size="sm"
          variant="default"
          onClick={handlePrevMonth}
          icon="arrow-left"
        >
          prev
        </DoodleButton>

        <h1
          style={{
            fontSize: "18px",
            fontWeight: 600,
            color: "var(--ink-primary)",
            textTransform: "lowercase",
            margin: 0,
          }}
        >
          {monthNames[currentMonth - 1]} {currentYear}
        </h1>

        <DoodleButton
          size="sm"
          variant="default"
          onClick={handleNextMonth}
          disabled={!canGoNext}
          iconRight="arrow-right"
        >
          next
        </DoodleButton>
      </div>

      {/* Weekday Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          textAlign: "center",
          fontSize: "14px",
          color: "var(--ink-secondary)",
          marginBottom: "10px",
          fontWeight: 600,
        }}
      >
        <span>m</span>
        <span>t</span>
        <span>w</span>
        <span>t</span>
        <span>f</span>
        <span>s</span>
        <span>s</span>
      </div>

      {/* Days Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "6px 4px",
          textAlign: "center",
        }}
      >
        {/* Empty cells before start of month */}
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`empty-${i}`} style={{ height: "46px" }} />
        ))}

        {/* Days of month */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const dateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
          const isToday = dateStr === todayStr;
          const isFuture = dateStr > todayStr;
          const isCompleted = completedDates.includes(dateStr);

          if (isFuture) {
            return (
              <div
                key={dateStr}
                style={{
                  height: "46px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--ink-muted)",
                  opacity: 0.35,
                  fontSize: "14px",
                }}
              >
                <span>{dayNum}</span>
              </div>
            );
          }

          return (
            <Link
              key={dateStr}
              href={`/daily?date=${dateStr}`}
              style={{
                textDecoration: "none",
                color: "var(--ink-primary)",
                height: "46px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isToday ? "var(--highlight-cell)" : "var(--bg-paper)",
                borderStyle: "solid",
                borderWidth: "10px",
                borderImage: "url(/doodle/button.svg) 10 10 10 10 stretch stretch",
                boxSizing: "border-box",
                padding: 0,
              }}
              title={`Daily puzzle for ${dateStr}`}
            >
              <span style={{ fontSize: "14px", fontWeight: isToday ? 700 : 500, lineHeight: 1.1 }}>
                {dayNum}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  lineHeight: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "12px",
                  color: isCompleted ? "var(--success-ink)" : "var(--ink-muted)",
                }}
              >
                {isCompleted ? <DoodleIcon name="check" size={12} /> : "·"}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Legend */}
      <div
        style={{
          marginTop: "28px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "18px",
          fontSize: "13px",
          color: "var(--ink-secondary)",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <DoodleIcon name="check" size={13} color="var(--success-ink)" /> completed
        </span>
        <span>· unplayed</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <span style={{ width: "12px", height: "12px", backgroundColor: "var(--highlight-cell)", border: "1px solid var(--ink-primary)" }} /> today
        </span>
      </div>
    </div>
  );
}
