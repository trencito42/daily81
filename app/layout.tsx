import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "@/styles/globals.css";
import { Header } from "@/components/doodle/Header";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "daily81 — Sudoku, every day",
  description: "A clean daily Sudoku with streaks, XP and detailed stats.",
  manifest: "/manifest.json",
  icons: {
    icon: "/daily81.svg",
    apple: "/daily81.svg",
  },
  openGraph: {
    title: "daily81 — Sudoku, every day",
    description: "A clean daily Sudoku with streaks, XP and detailed stats.",
    url: "https://daily81.com",
    siteName: "daily81",
    locale: "en_US",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FDF9F3",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user = null;
  try {
    const session = await getSession();
    if (session) {
      user = await prisma.user.findUnique({
        where: { id: session.id },
        select: {
          id: true,
          displayName: true,
          xp: true,
          level: true,
        },
      });
    }
  } catch {
    // Graceful fallback
  }

  return (
    <html lang="en">
      <head>
        {/* Analytics — loaded async, never blocks gameplay */}
        {process.env.NEXT_PUBLIC_WITCH_PROJECT_ID && (
          <Script
            src="https://witch.pw/sdk/browser.js"
            data-project={process.env.NEXT_PUBLIC_WITCH_PROJECT_ID}
            strategy="afterInteractive"
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body className="doodle" style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
        <Header user={user} />
        <main style={{ flex: 1, display: "flex", flexDirection: "column", width: "100%" }}>
          {children}
        </main>
        <footer
          style={{
            textAlign: "center",
            padding: "12px 16px max(16px, env(safe-area-inset-bottom))",
            fontSize: "12px",
            color: "var(--ink-secondary)",
            fontFamily: "var(--font-doodle)",
            userSelect: "none",
          }}
        >
          daily81.com · interactive math notebook
        </footer>
      </body>
    </html>
  );
}
