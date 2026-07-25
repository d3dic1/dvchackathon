# Tip Tap Games

A TikTok/Reels-style vertical swipe feed where every full-screen card is a playable one-thumb mini-game.

## How to run

```
npm run dev
```

- Frontend (Vite): http://localhost:5000
- API (Express): http://localhost:3001
- Vite proxies `/api` requests to Express automatically.

## Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express + TypeScript (tsx for dev)
- **Storage**: In-memory by default; PostgreSQL if DATABASE_URL is set

## Games

- **Orbit Lock** – Tap when the orbiting marker hits the glowing target arc
- **Lane Shift** – Tap to switch lanes and dodge incoming barriers  
- **Echo Grid** – Memorise and repeat a growing pad sequence
- **Gravity Flip** – Flip between floor and ceiling to dodge obstacles

## Project structure

```
src/
  games/         OrbitLock, LaneShift, EchoGrid, GravityFlip
  components/    Feed, GameCard, GameOver, ScoreHUD, SocialRail, …
  hooks/         usePersonalBest, useLeaderboard
  types/         game.ts (shared GameProps interface)
  utils/         deviceId, haptics
server/
  index.ts       Express entry point (port 3001)
  routes/        scores.ts — POST /api/scores, GET /api/leaderboard/:gameSlug
  services/      scoreService.ts — in-memory + optional PostgreSQL
```

## User preferences

- Mobile-first (390×844 primary target), desktop usable
- Dark neon aesthetic: acid-lime #c8ff00, electric cyan #00e5ff, violet #9b5de5, hot-pink #ff006e
- No login screen, no marketing homepage, no game-selection menu
