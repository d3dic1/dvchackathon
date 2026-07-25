import { Pool } from 'pg'

export interface Score {
  id: number
  gameSlug: string
  deviceId: string
  score: number
  timestamp: number
  runId: string
}

export interface LeaderboardEntry {
  rank: number
  score: number
  deviceId: string
}

export interface LeaderboardData {
  entries: LeaderboardEntry[]
  playerEntry: LeaderboardEntry | null
  rivalEntry: LeaderboardEntry | null
  totalPlayers: number
}

export interface ScoreService {
  saveScore(gameSlug: string, deviceId: string, score: number, runId: string): Promise<Score>
  getLeaderboard(gameSlug: string, limit?: number, deviceId?: string): Promise<LeaderboardData>
}

// --- In-memory implementation (fallback when DATABASE_URL is absent) ---
class InMemoryScoreService implements ScoreService {
  private scores: Score[] = []
  private nextId = 1
  private usedRuns = new Set<string>()

  async saveScore(gameSlug: string, deviceId: string, score: number, runId: string): Promise<Score> {
    if (this.usedRuns.has(runId)) throw new Error('Run already submitted')
    this.usedRuns.add(runId)
    const entry: Score = {
      id: this.nextId++,
      gameSlug,
      deviceId,
      score,
      timestamp: Date.now(),
      runId,
    }
    this.scores.push(entry)
    return entry
  }

  async getLeaderboard(gameSlug: string, limit = 10, deviceId?: string): Promise<LeaderboardData> {
    const bestByDevice = new Map<string, number>()
    for (const s of this.scores) {
      if (s.gameSlug !== gameSlug) continue
      const prev = bestByDevice.get(s.deviceId) ?? 0
      if (s.score > prev) bestByDevice.set(s.deviceId, s.score)
    }
    const ranked = Array.from(bestByDevice.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([deviceId, score], i) => ({ rank: i + 1, score, deviceId }))
    return {
      entries: ranked.slice(0, limit),
      playerEntry: deviceId ? ranked.find(entry => entry.deviceId === deviceId) ?? null : null,
      rivalEntry: (() => {
        if (!deviceId) return null
        const playerIndex = ranked.findIndex(entry => entry.deviceId === deviceId)
        return playerIndex > 0 ? ranked[playerIndex - 1] : null
      })(),
      totalPlayers: ranked.length,
    }
  }
}

// --- PostgreSQL implementation ---
class PgScoreService implements ScoreService {
  constructor(private pool: Pool) {}

  async saveScore(gameSlug: string, deviceId: string, score: number, runId: string): Promise<Score> {
    const res = await this.pool.query<{
      id: number; game_slug: string; device_id: string; score: number; timestamp: string; run_id: string
    }>(
      'INSERT INTO scores(game_slug, device_id, score, timestamp, run_id) VALUES($1, $2, $3, $4, $5) RETURNING *',
      [gameSlug, deviceId, score, Date.now(), runId]
    )
    const row = res.rows[0]
    return {
      id: row.id,
      gameSlug: row.game_slug,
      deviceId: row.device_id,
      score: row.score,
      timestamp: Number(row.timestamp),
      runId: row.run_id,
    }
  }

  async getLeaderboard(gameSlug: string, limit = 10, deviceId?: string): Promise<LeaderboardData> {
    const res = await this.pool.query<{
      device_id: string; best_score: string; rank: string; total_players: string
    }>(
      `WITH best AS (
         SELECT device_id, MAX(score) AS best_score
         FROM scores
         WHERE game_slug = $1
         GROUP BY device_id
       ), ranked AS (
         SELECT device_id, best_score,
           RANK() OVER (ORDER BY best_score DESC) AS rank,
           COUNT(*) OVER () AS total_players
         FROM best
       )
       SELECT * FROM ranked
       WHERE rank <= $2
          OR device_id = $3
          OR rank = (SELECT rank - 1 FROM ranked WHERE device_id = $3)
       ORDER BY rank`,
      [gameSlug, limit, deviceId ?? '']
    )
    const ranked = res.rows.map(row => ({
      rank: Number(row.rank),
      score: Number(row.best_score),
      deviceId: row.device_id,
    }))
    return {
      entries: ranked.filter(entry => entry.rank <= limit),
      playerEntry: deviceId ? ranked.find(entry => entry.deviceId === deviceId) ?? null : null,
      rivalEntry: deviceId
        ? ranked
            .filter(entry => entry.deviceId !== deviceId)
            .sort((a, b) => b.rank - a.rank)
            .find(entry => entry.rank < (ranked.find(item => item.deviceId === deviceId)?.rank ?? 0)) ?? null
        : null,
      totalPlayers: Number(res.rows[0]?.total_players ?? 0),
    }
  }
}

// --- Service factory (singleton) ---
let _service: ScoreService | null = null
let _storageMode: 'postgres' | 'memory' = 'memory'

export function getScoreStorageMode() {
  return _storageMode
}

export async function getScoreService(): Promise<ScoreService> {
  if (_service) return _service

  const url = process.env.DATABASE_URL
  if (url) {
    try {
      const pool = new Pool({ connectionString: url })
      // Verify connectivity with a lightweight query
      await pool.query('SELECT 1')
      await pool.query(`
        CREATE TABLE IF NOT EXISTS scores (
          id SERIAL PRIMARY KEY,
          game_slug TEXT NOT NULL,
          device_id TEXT NOT NULL,
          score INTEGER NOT NULL CHECK (score >= 0 AND score <= 9999999),
          timestamp BIGINT NOT NULL
        )
      `)
      await pool.query('ALTER TABLE scores ADD COLUMN IF NOT EXISTS run_id TEXT')
      await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_scores_run_id ON scores(run_id) WHERE run_id IS NOT NULL')
      await pool.query('CREATE INDEX IF NOT EXISTS idx_scores_slug ON scores(game_slug)')
      await pool.query('CREATE INDEX IF NOT EXISTS idx_scores_device ON scores(game_slug, device_id)')
      _service = new PgScoreService(pool)
      _storageMode = 'postgres'
      console.log('[scores] Using PostgreSQL score service')
      return _service
    } catch (err) {
      console.warn('[scores] PostgreSQL unavailable, falling back to in-memory:', (err as Error).message)
    }
  } else {
    console.warn('[scores] DATABASE_URL not set — using in-memory store (scores will not persist)')
  }

  _service = new InMemoryScoreService()
  _storageMode = 'memory'
  return _service
}
