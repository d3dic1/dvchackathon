---
name: Personal best cross-device
description: How the Personal Best HUD shows the correct value on every device for signed-in users
---

**Rule:** Seed `localStorage` personal best from `playerEntry.score` (server response) on every leaderboard load.

**Why:** `usePersonalBest` reads from `localStorage` which is device-local. After sign-in + merge, the server knows the all-time best via the PostgreSQL max-score query. Calling `updatePersonalBest(playerEntry.score)` in a `useEffect` whenever `playerEntry` changes upgrades the local value to the server-backed max — no extra API endpoint needed.

**Implementation location:** `GameCard.tsx` — a `useEffect` that watches `[playerEntry, updatePersonalBest]`.

**Guarantee:** On a fresh device, after the leaderboard loads (which happens on mount), the HUD updates to show the authenticated player's actual cross-device best within one render cycle.

**How to apply:** If `usePersonalBest` is ever used in a new context, ensure `playerEntry` seeding is also wired in the parent component.
