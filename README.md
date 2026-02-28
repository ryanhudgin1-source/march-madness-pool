# March Madness Pool Dashboard

A web app for running an annual March Madness team draft pool with 8 participants. Built with Next.js and deployed on Vercel.

## How It Works

- **Snake Draft**: 8 participants draft 8 teams each (1-2-3-4-5-6-7-8-8-7-6-5-4-3-2-1).
- **Scoring**: Each win earns `seed x round number` points (cumulative).
- **Two Ways to Win**: Draft the national champion OR accumulate the most points.

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repository
3. In the Vercel dashboard, go to **Storage** > **Create Database** > choose **Neon Postgres**
4. Link the database to your project (this auto-sets `DATABASE_URL`)
5. Deploy -- Vercel builds and hosts the app automatically
6. Visit your live URL and click **Initialize Database** on the home page

Your pool members can now access the dashboard at your Vercel URL (e.g., `your-app.vercel.app`).

## Local Development

1. Create a free Postgres database at [neon.tech](https://neon.tech)
2. Copy your connection string into `.env.local`:
   ```
   DATABASE_URL="postgres://user:password@host/dbname?sslmode=require"
   ```
3. Install and run:
   ```bash
   npm install
   npm run dev
   ```
4. Open `http://localhost:3000`
5. Click **Initialize Database** on the home page to create tables

## Setup Flow

1. Click **New Tournament** and enter the year + 8 participant names
2. **Import from ESPN** to load the 64 tournament teams, or enter them manually
3. Click **Start Draft** and select teams in snake order
4. Once drafted, use the **Dashboard** to track the tournament

## Dashboard Features

- **Leaderboard**: Live standings with points, teams alive, and champion tracker
- **Bracket**: Full tournament bracket color-coded by team owner -- click matchups to advance winners
- **Games**: Upcoming matchups showing both teams and their pool owners
- **Teams**: All teams grouped by participant with point breakdowns
- **Refresh Scores**: Auto-fetch results from ESPN

## Tech Stack

- Next.js 14 (App Router)
- Neon Postgres (serverless)
- Tailwind CSS (dark theme)
- ESPN API for tournament data
