import { Pool } from 'pg'

export interface Score {
  id: number
  gameSlug: string
  deviceId: string
  score: number
  timestamp: number
  runId: string
  userId?: string
}

export interface LeaderboardEntry {
  rank: number
  score: number
  /** COALESCE(user_id, device_id) — the effective player identity */
  deviceId: string
  displayName?: string
  avatarUrl?: string
}

export interface LeaderboardData {
  entries: LeaderboardEntry[]
  playerEntry: LeaderboardEntry | null
  rivalEntry: LeaderboardEntry | null
  totalPlayers: number
  /** Effective player key for the requesting device (user_id if merged, device_id otherwise) */
  myPlayerId: string
  allTimeBest: number
}

export interface ScoreService {
  saveScore(
    gameSlug: string,
    deviceId: string,
    score: number,
    runId: string,
    userId?: string,
    displayName?: string,
    avatarUrl?: string,
  ): Promise<Score>
  getLeaderboard(
    gameSlug: string,
    limit?: number,
    deviceId?: string,
    userId?: string,
    since?: number,
  ): Promise<LeaderboardData>
  mergeGuestScores(
    deviceId: string,
    userId: string,
    displayName?: string,
    avatarUrl?: string,
  ): Promise<number>
}

// ---------------------------------------------------------------------------
// In-memory fallback (no DATABASE_URL)
// ---------------------------------------------------------------------------
class InMemoryScoreService implements ScoreService {
  private scores: (Score & { userId?: string; displayName?: string; avatarUrl?: string })[] = []
  private nextId = 1
  private usedRuns = new Set<string>()

  async saveScore(
    gameSlug: string, deviceId: string, score: number, runId: string,
    userId?: string, displayName?: string, avatarUrl?: string,
  ): Promise<Score> {
    if (this.usedRuns.has(runId)) throw new Error('Run already submitted')
    this.usedRuns.add(runId)
    const entry = { id: this.nextId++, gameSlug, deviceId, score, timestamp: Date.now(), runId, userId, displayName, avatarUrl }
    this.scores.push(entry)
    return entry
  }

  async getLeaderboard(
    gameSlug: string,
    limit = 10,
    deviceId?: string,
    userId?: string,
    since?: number,
  ): Promise<LeaderboardData> {
    const allScores = this.scores.filter(s => s.gameSlug === gameSlug)
    const bestByKey = new Map<string, { score: number; displayName?: string; avatarUrl?: string }>()
    const deviceToKey = new Map<string, string>()
    for (const s of allScores) {
      const key = s.userId ?? s.deviceId
      deviceToKey.set(s.deviceId, key)
      if (since && s.timestamp < since) continue
      const prev = bestByKey.get(key)?.score ?? 0
      if (s.score > prev) bestByKey.set(key, { score: s.score, displayName: s.displayName, avatarUrl: s.avatarUrl })
    }
    const ranked = Array.from(bestByKey.entries())
      .sort((a, b) => b[1].score - a[1].score)
      .map(([key, info], i) => ({ rank: i + 1, score: info.score, deviceId: key, displayName: info.displayName, avatarUrl: info.avatarUrl }))
    const myPlayerId = userId ?? (deviceId ? (deviceToKey.get(deviceId) ?? deviceId) : '')
    const allTimeBest = allScores
      .filter(item => (item.userId ?? item.deviceId) === myPlayerId)
      .reduce((best, item) => Math.max(best, item.score), 0)
    const playerRank = ranked.find(e => e.deviceId === myPlayerId)?.rank ?? 0
    return {
      entries: ranked.slice(0, limit),
      playerEntry: myPlayerId ? ranked.find(e => e.deviceId === myPlayerId) ?? null : null,
      rivalEntry: playerRank > 1 ? ranked.find(e => e.rank === playerRank - 1) ?? null : null,
      totalPlayers: ranked.length,
      myPlayerId,
      allTimeBest,
    }
  }

  async mergeGuestScores(deviceId: string, userId: string, displayName?: string, avatarUrl?: string): Promise<number> {
    let count = 0
    for (const s of this.scores) {
      if (s.deviceId === deviceId && (!s.userId || s.userId === userId)) {
        s.userId = userId
        s.displayName = displayName
        s.avatarUrl = avatarUrl
        count++
      }
    }
    return count
  }
}

// ---------------------------------------------------------------------------
// PostgreSQL implementation
// ---------------------------------------------------------------------------
class PgScoreService implements ScoreService {
  constructor(private pool: Pool) {}

  async saveScore(
    gameSlug: string, deviceId: string, score: number, runId: string,
    userId?: string, displayName?: string, avatarUrl?: string,
  ): Promise<Score> {
    const res = await this.pool.query<{
      id: number; game_slug: string; device_id: string; score: number
      timestamp: string; run_id: string; user_id: string | null
    }>(
      `INSERT INTO scores(game_slug, device_id, score, timestamp, run_id, user_id, display_name, avatar_url)
       VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [gameSlug, deviceId, score, Date.now(), runId, userId ?? null, displayName ?? null, avatarUrl ?? null],
    )
    const row = res.rows[0]
    return {
      id: row.id,
      gameSlug: row.game_slug,
      deviceId: row.device_id,
      score: row.score,
      timestamp: Number(row.timestamp),
      runId: row.run_id,
      userId: row.user_id ?? undefined,
    }
  }

  async getLeaderboard(
    gameSlug: string,
    limit = 10,
    deviceId?: string,
    userId?: string,
    since?: number,
  ): Promise<LeaderboardData> {
    const safeDeviceId = deviceId ?? ''
    const res = await this.pool.query<{
      player_key: string
      best_score: string
      display_name: string | null
      avatar_url: string | null
      rank: string
      total_players: string
      my_player_key: string
    }>(
      `WITH player_id_lookup AS (
         -- Resolve the requesting device's effective identity (user_id if merged, else device_id)
         SELECT COALESCE($4, MAX(user_id), $3) AS player_key
         FROM scores
         WHERE game_slug = $1 AND device_id = $3
       ),
       best AS (
         SELECT
           COALESCE(user_id, device_id) AS player_key,
           MAX(score)                   AS best_score,
           MAX(display_name)            AS display_name,
           MAX(avatar_url)              AS avatar_url
         FROM scores
         WHERE game_slug = $1
           AND ($5::BIGINT IS NULL OR timestamp >= $5)
         GROUP BY COALESCE(user_id, device_id)
       ),
       ranked AS (
         SELECT *,
           RANK() OVER (ORDER BY best_score DESC)::INTEGER AS rank,
           COUNT(*) OVER ()::INTEGER                       AS total_players
         FROM best
       )
       SELECT r.*, pi.player_key AS my_player_key
       FROM ranked r, player_id_lookup pi
       WHERE r.rank <= $2
          OR r.player_key = pi.player_key
          OR r.rank = (SELECT r2.rank - 1 FROM ranked r2 WHERE r2.player_key = pi.player_key LIMIT 1)
       ORDER BY r.rank`,
      [gameSlug, limit, safeDeviceId, userId ?? null, since ?? null],
    )

    const myPlayerId = userId ?? res.rows[0]?.my_player_key ?? safeDeviceId
    const ranked = res.rows.map(row => ({
      rank: Number(row.rank),
      score: Number(row.best_score),
      deviceId: row.player_key,        // effective identity: user_id or device_id
      displayName: row.display_name ?? undefined,
      avatarUrl: row.avatar_url ?? undefined,
    }))
    const playerRank = ranked.find(e => e.deviceId === myPlayerId)?.rank ?? 0

    const bestRes = await this.pool.query<{ best_score: string | null }>(
      `SELECT MAX(score)::TEXT AS best_score
       FROM scores
       WHERE game_slug = $1
         AND COALESCE(user_id, device_id) = $2`,
      [gameSlug, myPlayerId],
    )

    return {
      entries: ranked.filter(e => e.rank <= limit),
      playerEntry: myPlayerId ? ranked.find(e => e.deviceId === myPlayerId) ?? null : null,
      rivalEntry: playerRank > 1 ? ranked.find(e => e.rank === playerRank - 1) ?? null : null,
      totalPlayers: Number(res.rows[0]?.total_players ?? 0),
      myPlayerId,
      allTimeBest: Number(bestRes.rows[0]?.best_score ?? 0),
    }
  }

  async mergeGuestScores(deviceId: string, userId: string, displayName?: string, avatarUrl?: string): Promise<number> {
    const res = await this.pool.query<{ count: string }>(
      `WITH updated AS (
         UPDATE scores
         SET user_id      = $2,
             display_name = COALESCE($3, display_name),
             avatar_url   = COALESCE($4, avatar_url)
         WHERE device_id = $1
           AND (user_id IS NULL OR user_id = $2)
         RETURNING id
       ) SELECT COUNT(*)::TEXT AS count FROM updated`,
      [deviceId, userId, displayName ?? null, avatarUrl ?? null],
    )
    return Number(res.rows[0]?.count ?? 0)
  }
}

// ---------------------------------------------------------------------------
// Factory singleton
// ---------------------------------------------------------------------------
let _service: ScoreService | null = null
let _storageMode: 'postgres' | 'memory' = 'memory'

export function getScoreStorageMode() { return _storageMode }

export async function getScoreService(): Promise<ScoreService> {
  if (_service) return _service

  const url = process.env.DATABASE_URL
  if (url) {
    try {
      const pool = new Pool({ connectionString: url })
      await pool.query('SELECT 1')
      // Idempotent schema boot — columns already exist from initial migration
      await pool.query(`CREATE TABLE IF NOT EXISTS scores (
        id SERIAL PRIMARY KEY,
        game_slug TEXT NOT NULL,
        device_id TEXT NOT NULL,
        score INTEGER NOT NULL CHECK (score >= 0 AND score <= 9999999),
        timestamp BIGINT NOT NULL
      )`)
      await pool.query(`ALTER TABLE scores ADD COLUMN IF NOT EXISTS run_id TEXT`)
      await pool.query(`ALTER TABLE scores ADD COLUMN IF NOT EXISTS user_id TEXT`)
      await pool.query(`ALTER TABLE scores ADD COLUMN IF NOT EXISTS display_name TEXT`)
      await pool.query(`ALTER TABLE scores ADD COLUMN IF NOT EXISTS avatar_url TEXT`)
      await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_scores_run_id ON scores(run_id) WHERE run_id IS NOT NULL`)
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_scores_slug   ON scores(game_slug)`)
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_scores_device ON scores(game_slug, device_id)`)
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_scores_user_id ON scores(user_id) WHERE user_id IS NOT NULL`)
      _service = new PgScoreService(pool)
      _storageMode = 'postgres'
      console.log('[scores] PostgreSQL — persistent storage active')
      return _service
    } catch (err) {
      console.warn('[scores] PostgreSQL unavailable, falling back to in-memory:', (err as Error).message)
    }
  } else {
    console.warn('[scores] DATABASE_URL not set — using in-memory store')
  }

  _service = new InMemoryScoreService()
  _storageMode = 'memory'
  return _service
}
