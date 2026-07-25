import { Pool } from 'pg'

export interface Score {
  id: number
  gameSlug: string
  deviceId: string
  score: number
  timestamp: number
}

export interface LeaderboardEntry {
  rank: number
  score: number
  deviceId: string
}

export interface ScoreService {
  saveScore(gameSlug: string, deviceId: string, score: number): Promise<Score>
  getLeaderboard(gameSlug: string, limit?: number): Promise<LeaderboardEntry[]>
}

// --- In-memory implementation (fallback when DATABASE_URL is absent) ---
class InMemoryScoreService implements ScoreService {
  private scores: Score[] = []
  private nextId = 1

  async saveScore(gameSlug: string, deviceId: string, score: number): Promise<Score> {
    const entry: Score = {
      id: this.nextId++,
      gameSlug,
      deviceId,
      score,
      timestamp: Date.now(),
    }
    this.scores.push(entry)
    return entry
  }

  async getLeaderboard(gameSlug: string, limit = 10): Promise<LeaderboardEntry[]> {
    const bestByDevice = new Map<string, number>()
    for (const s of this.scores) {
      if (s.gameSlug !== gameSlug) continue
      const prev = bestByDevice.get(s.deviceId) ?? 0
      if (s.score > prev) bestByDevice.set(s.deviceId, s.score)
    }
    return Array.from(bestByDevice.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([deviceId, score], i) => ({ rank: i + 1, score, deviceId }))
  }
}

// --- PostgreSQL implementation ---
class PgScoreService implements ScoreService {
  constructor(private pool: Pool) {}

  async saveScore(gameSlug: string, deviceId: string, score: number): Promise<Score> {
    const res = await this.pool.query<{
      id: number; game_slug: string; device_id: string; score: number; timestamp: string
    }>(
      'INSERT INTO scores(game_slug, device_id, score, timestamp) VALUES($1, $2, $3, $4) RETURNING *',
      [gameSlug, deviceId, score, Date.now()]
    )
    const row = res.rows[0]
    return {
      id: row.id,
      gameSlug: row.game_slug,
      deviceId: row.device_id,
      score: row.score,
      timestamp: Number(row.timestamp),
    }
  }

  async getLeaderboard(gameSlug: string, limit = 10): Promise<LeaderboardEntry[]> {
    const res = await this.pool.query<{ device_id: string; best_score: string }>(
      `SELECT device_id, MAX(score) AS best_score
       FROM scores
       WHERE game_slug = $1
       GROUP BY device_id
       ORDER BY best_score DESC
       LIMIT $2`,
      [gameSlug, limit]
    )
    return res.rows.map((row, i) => ({
      rank: i + 1,
      score: Number(row.best_score),
      deviceId: row.device_id,
    }))
  }
}

// --- Service factory (singleton) ---
let _service: ScoreService | null = null

export async function getScoreService(): Promise<ScoreService> {
  if (_service) return _service

  const url = process.env.DATABASE_URL
  if (url) {
    try {
      const pool = new Pool({ connectionString: url })
      // Verify connectivity with a lightweight query
      await pool.query('SELECT 1')
      _service = new PgScoreService(pool)
      console.log('[scores] Using PostgreSQL score service')
      return _service
    } catch (err) {
      console.warn('[scores] PostgreSQL unavailable, falling back to in-memory:', (err as Error).message)
    }
  } else {
    console.warn('[scores] DATABASE_URL not set — using in-memory store (scores will not persist)')
  }

  _service = new InMemoryScoreService()
  return _service
}
