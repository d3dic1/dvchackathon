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

// --- In-memory implementation ---
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
    // Best score per device
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

// --- PostgreSQL implementation (optional) ---
async function tryCreatePgService(): Promise<ScoreService | null> {
  const url = process.env.DATABASE_URL
  if (!url) return null

  try {
    const pg = await import('pg')
    const pool = new pg.default.Pool({ connectionString: url })

    // Create table if needed
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scores (
        id SERIAL PRIMARY KEY,
        game_slug TEXT NOT NULL,
        device_id TEXT NOT NULL,
        score INTEGER NOT NULL,
        timestamp BIGINT NOT NULL
      )
    `)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_scores_slug ON scores(game_slug)`)

    return {
      async saveScore(gameSlug, deviceId, score) {
        const ts = Date.now()
        const res = await pool.query(
          'INSERT INTO scores(game_slug, device_id, score, timestamp) VALUES($1,$2,$3,$4) RETURNING *',
          [gameSlug, deviceId, score, ts]
        )
        const row = res.rows[0]
        return { id: row.id, gameSlug: row.game_slug, deviceId: row.device_id, score: row.score, timestamp: Number(row.timestamp) }
      },

      async getLeaderboard(gameSlug, limit = 10) {
        const res = await pool.query(
          `SELECT device_id, MAX(score) as best_score
           FROM scores WHERE game_slug = $1
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
      },
    }
  } catch (err) {
    console.warn('[scores] PostgreSQL not available, using in-memory store:', (err as Error).message)
    return null
  }
}

let _service: ScoreService | null = null

export async function getScoreService(): Promise<ScoreService> {
  if (_service) return _service
  const pg = await tryCreatePgService()
  _service = pg ?? new InMemoryScoreService()
  console.log(`[scores] Using ${pg ? 'PostgreSQL' : 'in-memory'} score service`)
  return _service
}
