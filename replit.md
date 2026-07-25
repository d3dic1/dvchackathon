# FLICKCADE

Mobile-first arcade feed — four playable one-thumb games in a TikTok-style vertical scroll.

## How to run (development)

```bash
npm run dev
```

- **Vite** dev server on **port 5000** (preview pane)
- **Express** API server on **port 3001**
- Vite proxies `/api/*` → Express automatically

## How to build + run (production)

```bash
npm run build   # → dist/client/ (Vite) + dist/server/ (tsc)
npm start       # → Express on port 5000 (serves API + static files)
```

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Vite |
| Backend | Express + TypeScript (tsx for dev, tsc for prod) |
| Database | Replit-managed PostgreSQL (via `pg`) |
| Storage fallback | In-memory (when DATABASE_URL absent) |

## Games

| Slug | Title | Mechanic |
|------|-------|----------|
| `orbit-lock` | Power Swing | Hit a shrinking sweet spot as the sports dial accelerates |
| `lane-shift` | Slalom Panic | Carve between lanes on a ruthless toy-like ski slope |
| `echo-grid` | Party Pattern | Repeat a fast four-button living-room sequence |
| `gravity-flip` | Skybound | Swap sides to survive a cheerful obstacle course |

## API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/runs` | Issue a signed, single-run score token |
| `POST` | `/api/scores` | Submit a validated run `{ gameSlug, deviceId, score, runToken }` |
| `GET` | `/api/leaderboard/:gameSlug` | Top 10, personal rank, rival and player count |
| `GET` | `/api/health` | Liveness and persistence status |

## Database schema

```sql
CREATE TABLE scores (
  id        SERIAL PRIMARY KEY,
  game_slug TEXT    NOT NULL,
  device_id TEXT    NOT NULL,
  score     INTEGER NOT NULL CHECK (score >= 0 AND score <= 9999999),
  timestamp BIGINT  NOT NULL,
  run_id    TEXT    UNIQUE
);
CREATE INDEX idx_scores_slug   ON scores(game_slug);
CREATE INDEX idx_scores_device ON scores(game_slug, device_id);
```

Schema is pre-created in the Replit dev database. Replit's publish flow mirrors it to production automatically.

## Environment variables

| Variable | Where set | Description |
|----------|-----------|-------------|
| `DATABASE_URL` | Replit (automatic) | PostgreSQL connection string |
| `PORT` | Replit / start script | HTTP port (dev: 3001, prod: 5000) |
| `NODE_ENV` | start script | `production` enables static serving |
| `SESSION_SECRET` | Replit Secrets | Reserved for future auth |

## Deployment

Configured as **autoscale**:
- **Build**: `npm run build`
- **Run**: `node dist/server/index.js` (with `NODE_ENV=production` → port 5000)

## User preferences

- Mobile-first (390 × 844 primary), desktop usable via phone-frame layout
- Neo-brutalist / retro-arcade visual design — cream, orange, blue, lime palette
- No login screen, no marketing homepage, no game-selection menu
- Scores and personal bests are guest-only (localStorage device ID)
