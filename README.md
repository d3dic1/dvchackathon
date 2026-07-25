# Tip Tap Games

A TikTok/Reels-style vertical feed where every card is a playable one-thumb mini-game.

## Games

| Game | Description |
|------|-------------|
| **Orbit Lock** | Tap the marker into the moving target zone. Build combos for speed. |
| **Lane Shift** | Switch lanes to dodge barriers as they rush toward you. |
| **Echo Grid** | Memorise and repeat ever-growing sequences on four glowing pads. |
| **Gravity Flip** | Flip between floor and ceiling to dodge obstacles in a neon tunnel. |

## Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express + TypeScript (`tsx` for development)
- **Storage**: In-memory by default; PostgreSQL when `DATABASE_URL` is set

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (optional)
cp .env.example .env
# Edit .env — only DATABASE_URL is optional; the app runs without it.

# 3. Start development (both servers)
npm run dev
```

- Frontend dev server: `http://localhost:5173`
- API server: `http://localhost:3001`

Vite proxies `/api` requests to the Express server automatically.

## API

| Method | Path | Body / Params | Description |
|--------|------|---------------|-------------|
| `POST` | `/api/scores` | `{ gameSlug, deviceId, score }` | Submit a score |
| `GET` | `/api/leaderboard/:gameSlug` | `?limit=10` | Get top scores |
| `GET` | `/api/health` | — | Health check |

## Environment Variables

See `.env.example` for the full list.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3001` | Express server port |
| `DATABASE_URL` | No | — | PostgreSQL connection string |
| `SESSION_SECRET` | No | — | Reserved for future auth |
