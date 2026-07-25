# FLICKCADE

**Play the scroll.** FLICKCADE is a mobile-first vertical feed where every card is an instantly playable one-thumb arcade game.

## Games

| Game | Mechanic |
| --- | --- |
| Power Swing | Hit a shrinking sweet spot as the sports timing dial accelerates. |
| Slalom Panic | Carve between lanes on an increasingly ruthless toy-like ski slope. |
| Party Pattern | Repeat a fast four-button sequence inspired by living-room party games. |
| Skybound | Swap between two sides of a cheerful obstacle course before hazards connect. |
| Micro Mayhem | Obey rapid tap, double, hold, and wait commands. |
| Cannon Dash | Fire a rotating cannon into shrinking target barrels. |
| Rail Blaster | Blast toy-bots while sparing decoy stars. |
| Turbo Serve | Return a table-tennis rally inside a shrinking timing window. |
| Reel Trouble | Manage fishing-line tension with press-and-release control. |
| Pin Drop | Lock direction and power in a two-tap bowling run. |

## Experience

- Full-screen vertical scroll-snap feed
- Automatic game start and hard cleanup off-screen
- Guest device identity and persistent personal bests
- Live per-game leaderboard API
- Share, sound, haptics, reduced-motion support
- Responsive mobile game surface with an expanded desktop presentation

## Stack

- React 18, TypeScript, Vite
- Express score API
- PostgreSQL when `DATABASE_URL` is available; in-memory fallback for local previews

## Run

```bash
npm install
npm run dev
```

The Vite client runs on port `5000` and proxies `/api` to Express on port `3001`.

## Build checks

```bash
npm run typecheck
npm run build
```
