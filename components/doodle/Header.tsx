"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { loadGuestProfile } from "@/lib/client/storage";
import { DoodleUnderline } from "./DoodleUnderline";

interface HeaderProps {
  user?: {
    displayName: string;
    xp: number;
    level: number;
  } | null;
}

export function Header({ user: serverUser }: HeaderProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [clientLevel, setClientLevel] = useState<number>(1);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    if (serverUser?.level) {
      setClientLevel(serverUser.level);
    } else {
      const profile = loadGuestProfile();
      setClientLevel(profile.level);
    }

    const handleStorage = () => {
      const p = loadGuestProfile();
      setClientLevel(p.level);
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [serverUser]);

  // Fetch unread notifications count
  useEffect(() => {
    const checkNotifications = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const json = await res.json();
          setUnreadCount(json.unreadCount || 0);
        }
      } catch {
        // Fallback
      }
    };

    checkNotifications();
    const interval = setInterval(checkNotifications, 45000);
    return () => clearInterval(interval);
  }, [pathname]);

  const navLinks = [
    { href: "/daily", label: "daily" },
    { href: "/play", label: "play" },
    { href: "/leaderboard", label: "leaderboard" },
    { href: "/friends", label: "friends", badge: unreadCount > 0 },
    { href: "/archive", label: "archive" },
  ];

  return (
    <header
      style={{
        width: "100%",
        maxWidth: "680px",
        margin: "0 auto",
        padding: "16px 20px 8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "relative",
        zIndex: 40,
      }}
    >
      {/* Brand with daily81.svg Logo */}
      <Link
        href="/"
        style={{
          textDecoration: "none",
          color: "var(--ink-primary)",
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/daily81.svg"
          alt="daily81 logo"
          width="24"
          height="24"
          style={{ width: "24px", height: "24px", display: "block" }}
        />
        <span
          style={{
            fontSize: "20px",
            fontWeight: 700,
            letterSpacing: "-0.5px",
            fontFamily: "var(--font-sans)",
            lineHeight: 1,
          }}
        >
          daily<span className="font-doodle" style={{ color: "var(--ink-secondary)", fontSize: "18px" }}>81</span>
        </span>
      </Link>

      {/* Desktop Navigation */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: "18px",
        }}
        className="desktop-nav"
      >
        {navLinks.map((link) => {
          const isActive = pathname === link.href || (link.href === "/daily" && pathname === "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "var(--ink-primary)" : "var(--ink-secondary)",
                position: "relative",
                padding: "2px 0",
              }}
            >
              {link.label}
              {isActive && <DoodleUnderline />}
              {link.badge && (
                <span
                  style={{
                    position: "absolute",
                    top: "-2px",
                    right: "-6px",
                    width: "6px",
                    height: "6px",
                    backgroundColor: "var(--error-ink)",
                    borderRadius: "50%",
                  }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Right User / Level indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <Link
          href="/profile"
          style={{
            textDecoration: "none",
            color: "var(--ink-primary)",
            fontSize: "13px",
            fontWeight: 600,
            fontFamily: "var(--font-mono)",
            padding: "3px 10px",
            border: "1.5px solid var(--ink-primary)",
            borderRadius: "255px 8px 225px 8px/8px 225px 8px 255px",
            backgroundColor: "var(--bg-paper)",
            transition: "background-color 0.1s ease",
          }}
          className="desktop-nav"
        >
          Lv. {clientLevel}
        </Link>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle Menu"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "6px",
            color: "var(--ink-primary)",
            fontSize: "20px",
            display: "none",
            position: "relative",
          }}
          className="mobile-toggle-btn"
        >
          {isMobileMenuOpen ? "✕" : "☰"}
          {unreadCount > 0 && !isMobileMenuOpen && (
            <span
              style={{
                position: "absolute",
                top: "4px",
                right: "4px",
                width: "6px",
                height: "6px",
                backgroundColor: "var(--error-ink)",
                borderRadius: "50%",
              }}
            />
          )}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: "16px",
            right: "16px",
            backgroundColor: "var(--bg-paper)",
            border: "1.5px solid var(--ink-primary)",
            borderRadius: "255px 12px 225px 12px/12px 225px 12px 255px",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
            zIndex: 50,
          }}
        >
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href === "/daily" && pathname === "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                style={{
                  textDecoration: "none",
                  fontSize: "16px",
                  fontWeight: isActive ? 600 : 400,
                  color: "var(--ink-primary)",
                  padding: "6px 0",
                  borderBottom: "1px solid var(--border-subtle)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>{link.label}</span>
                {link.badge && (
                  <span
                    style={{
                      backgroundColor: "var(--error-ink)",
                      color: "#fff",
                      fontSize: "11px",
                      borderRadius: "50%",
                      padding: "1px 6px",
                      fontWeight: 700,
                    }}
                  >
                    new
                  </span>
                )}
              </Link>
            );
          })}
          <Link
            href="/stats"
            onClick={() => setIsMobileMenuOpen(false)}
            style={{
              textDecoration: "none",
              fontSize: "16px",
              color: "var(--ink-primary)",
              padding: "6px 0",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            stats
          </Link>
          <Link
            href="/settings"
            onClick={() => setIsMobileMenuOpen(false)}
            style={{
              textDecoration: "none",
              fontSize: "16px",
              color: "var(--ink-primary)",
              padding: "6px 0",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            settings
          </Link>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px" }}>
            <Link
              href="/profile"
              onClick={() => setIsMobileMenuOpen(false)}
              style={{ textDecoration: "none", color: "var(--ink-primary)", fontSize: "14px", fontWeight: 600 }}
            >
              profile & level (Lv. {clientLevel})
            </Link>
          </div>
        </div>
      )}

      <style jsx>{`
        @media (max-width: 600px) {
          :global(.desktop-nav) {
            display: none !important;
          }
          :global(.mobile-toggle-btn) {
            display: block !important;
          }
        }
      `}</style>
    </header>
  );
}
