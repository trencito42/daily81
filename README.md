# daily81 (daily81.com)

A minimalist Sudoku web application centered around daily puzzles, streaks, XP, levels, personal statistics, and clean mathematical presentation — designed like an interactive mathematics notebook.

## Production Deployment (CloudPanel VPS)

* **Port**: `3007` (`0.0.0.0:3007`)
* **Process Manager**: PM2 or systemd
* **Database**: MySQL

### 1. Environment Setup

Copy `.env.example` to `.env` and fill in your MySQL database credentials and auth secret:

```bash
cp .env.example .env
```

Example `.env`:
```env
NODE_ENV=production
PORT=3007

DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=daily81
DATABASE_USER=daily81_user
DATABASE_PASSWORD=your_secure_password_here
DATABASE_URL="mysql://daily81_user:your_secure_password_here@localhost:3306/daily81"

NEXTAUTH_SECRET=your_32_character_secret_key
NEXTAUTH_URL=https://daily81.com
DAILY_SEED_PEPPER=your_private_server_seed_pepper_here
```

### 2. Database Migration

Run the Prisma migration to create tables in MySQL:

```bash
npm run prisma:push
# or
npm run prisma:migrate
```

### 3. Build & Run

```bash
# Install dependencies
npm install

# Build the Next.js production bundle
npm run build

# Start with PM2 using ecosystem.config.js
pm2 start ecosystem.config.js

# Or start directly
PORT=3007 npm start
```

### 4. CloudPanel / Nginx Reverse Proxy

In CloudPanel Node.js site settings:
* **Port**: `3007`
* **Root Directory**: `/home/daily81/htdocs/daily81.com`
* Nginx proxy handles SSL termination and routes `https://daily81.com` to `http://127.0.0.1:3007`.

---

## Features & Architecture

* **Sudoku Engine**: Pure TypeScript solver and deterministic generator (`lib/sudoku/`). Puzzles have guaranteed unique single solutions and mathematical difficulty ratings.
* **Daily Sudoku Integrity**: Deterministic across all players on a calendar date, protected by server-side private seed pepper.
* **XP & Level Progression**: Deterministic level curve with bonus points for zero mistakes, no hints, daily completion, and speed.
* **Timezone-Safe Streaks**: Normalized date comparisons to protect player streaks.
* **Visual Identity**: Warm paper (`#FDF9F3`), primary ink (`#191919`), pencil highlights, Short Stack doodle accents, with pixel-perfect mathematical grid geometry.
* **Audio & Haptics**: Subtle procedural Web Audio API pencil friction feedback and mobile haptic pulses (toggleable in `/settings`).
* **Guest to Account Migration**: Guests play immediately without signup; creating an account seamlessly preserves and merges local XP, streaks, and stats.
* **PWA & SEO**: Installable web app with standalone manifest, sitemap, robots.txt, and Open Graph tags.

---

## Unit Testing

Run the test suite with Vitest:

```bash
npm test
```
