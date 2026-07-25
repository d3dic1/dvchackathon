---
name: Score identity model
description: How guest and authenticated player identities are unified in the leaderboard
---

**Rule:** The effective player key throughout the system is `COALESCE(user_id, device_id)`.

**Why:** Guests only have a `device_id` (localStorage UUID). After sign-in, historical guest rows get `user_id` stamped via `mergeGuestScores()`. Future authenticated scores arrive with `user_id` directly. Using COALESCE means a single SQL grouping works for both cases with no data deletion.

**Schema additions (non-breaking):** Three `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` columns added to `scores`: `user_id TEXT`, `display_name TEXT`, `avatar_url TEXT`. All nullable; existing rows just read `NULL`.

**Merge endpoint:** `POST /api/auth/merge` — requires valid Clerk JWT (401 without). Stamps `user_id`, `display_name`, `avatar_url` on all guest rows for the device. Idempotent (safe to call twice). Fetches authoritative display name + avatar from Clerk user API.

**`myPlayerId` field:** The leaderboard response includes `myPlayerId` — resolved to `user_id` if the device has any merged rows, otherwise `device_id`. Frontend uses this as the "is me" key in LeaderboardPanel.

**`flickcade:merged` custom event:** Dispatched by `useFlickcadeAuth` after successful merge. `useLeaderboard` listens and re-fetches so the display name appears without a page reload.

**How to apply:** Any new leaderboard query must use `COALESCE(user_id, device_id)` for grouping, not just `device_id`.
