# FLICKCADE

Mobile-first arcade feed - ten playable one-thumb games in a vertical short-form scroll.

## Development

```bash
npm run dev
```

- Vite preview: port 5000
- Express API: port 3001
- Vite proxies `/api/*` to Express

## Production

```bash
npm run build
npm start
```

Express serves the API and built frontend on port 5000.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Backend | Express, TypeScript |
| Database | Replit-managed PostgreSQL |
| Local fallback | In-memory scores when `DATABASE_URL` is absent |

## Games

| Slug | Title | Mechanic |
|---|---|---|
| `orbit-lock` | Power Swing | Hit a shrinking sweet spot as the sports dial accelerates |
| `lane-shift` | Slalom Panic | Carve between lanes on a ruthless toy-like ski slope |
| `echo-grid` | Party Pattern | Repeat a fast four-button living-room sequence |
| `gravity-flip` | Skybound | Swap sides to survive a cheerful obstacle course |
| `micro-mayhem` | Micro Mayhem | Obey rapid tap, double, hold, and wait commands |
| `cannon-dash` | Cannon Dash | Fire a rotating cannon into shrinking target barrels |
| `rail-blaster` | Rail Blaster | Blast toy-bots while sparing decoy stars |
| `turbo-serve` | Turbo Serve | Return a table-tennis rally inside a shrinking timing window |
| `reel-trouble` | Reel Trouble | Manage fishing-line tension with press-and-release control |
| `pin-drop` | Pin Drop | Lock direction and power in a two-tap bowling run |

## API

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/runs` | Issue a signed, single-run score token |
| `POST` | `/api/scores` | Submit `{ gameSlug, deviceId, score, runToken }` |
| `GET` | `/api/leaderboard/:gameSlug` | Top 10, personal rank, rival and player count |
| `GET` | `/api/health` | Liveness and persistence status |

## Database

The server creates and upgrades the score table automatically. Scores include a unique `run_id` so the same signed run cannot be submitted twice.

## Environment

| Variable | Source | Purpose |
|---|---|---|
| `DATABASE_URL` | Replit | PostgreSQL connection |
| `PORT` | Replit | Server port |
| `NODE_ENV` | Deployment | Enables static production serving |
| `SESSION_SECRET` | Replit Secrets | Signs run tokens |

## Product constraints

- Design for 390 x 844 first.
- Keep the feed as the product: no game library or lobby.
- No login wall, forced tutorial, copied characters, or third-party game assets.
- Every game auto-starts on screen and hard-stops off screen.
- Vertical swipes must never be interpreted as game input.
