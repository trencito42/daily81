"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getTodayDateString } from "@/lib/daily/streak";
import { getCompletedDailyDates } from "@/lib/client/storage";

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
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
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
        maxWidth: "480px",
        margin: "12px auto",
        padding: "16px 20px",
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
        <button
          type="button"
          onClick={handlePrevMonth}
          className="doodle-button doodle-button-sm"
          style={{ fontSize: "13px" }}
        >
          ← prev
        </button>

        <h1
          style={{
            fontSize: "16px",
            fontWeight: 700,
            letterSpacing: "1px",
            color: "var(--ink-primary)",
          }}
        >
          {monthNames[currentMonth - 1]} {currentYear}
        </h1>

        <button
          type="button"
          onClick={handleNextMonth}
          disabled={!canGoNext}
          className="doodle-button doodle-button-sm"
          style={{ fontSize: "13px", opacity: canGoNext ? 1 : 0.3 }}
        >
          next →
        </button>
      </div>

      {/* Weekday Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          textAlign: "center",
          fontFamily: "var(--font-doodle)",
          fontSize: "14px",
          color: "var(--ink-secondary)",
          marginBottom: "12px",
        }}
      >
        <span>M</span>
        <span>T</span>
        <span>W</span>
        <span>T</span>
        <span>F</span>
        <span>S</span>
        <span>S</span>
      </div>

      {/* Days Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "8px 4px",
          textAlign: "center",
        }}
      >
        {/* Empty cells before start of month */}
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`empty-${i}`} style={{ height: "48px" }} />
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
                  height: "48px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--ink-muted)",
                  opacity: 0.3,
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
                height: "48px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                border: isToday ? "1.5px solid var(--ink-primary)" : "1px solid transparent",
                borderRadius: "255px 6px 225px 6px/6px 225px 6px 255px",
                backgroundColor: isToday ? "var(--highlight-cell)" : "transparent",
                transition: "background-color 0.1s ease",
              }}
              title={`Daily puzzle for ${dateStr}`}
            >
              <span style={{ fontSize: "14px", fontWeight: isToday ? 700 : 500 }}>
                {dayNum}
              </span>
              <span
                style={{
                  fontSize: "12px",
                  lineHeight: 1,
                  fontFamily: "var(--font-doodle)",
                  color: isCompleted ? "var(--success-ink)" : "var(--ink-muted)",
                }}
              >
                {isCompleted ? "✓" : "·"}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Legend */}
      <div
        style={{
          marginTop: "32px",
          display: "flex",
          justifyContent: "center",
          gap: "20px",
          fontSize: "12px",
          color: "var(--ink-secondary)",
          fontFamily: "var(--font-doodle)",
        }}
      >
        <span>✓ completed</span>
        <span>· unplayed</span>
        <span>highlight: today</span>
      </div>
    </div>
  );
}
