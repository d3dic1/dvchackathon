import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { getScoreService } from '../services/scoreService'

const router = Router()

const PostScoreSchema = z.object({
  gameSlug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
  deviceId: z.string().min(8).max(128),
  score: z.number().int().min(0).max(9_999_999),
})

// POST /api/scores
router.post('/', async (req: Request, res: Response) => {
  const parsed = PostScoreSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  }
  const { gameSlug, deviceId, score } = parsed.data
  try {
    const service = await getScoreService()
    const entry = await service.saveScore(gameSlug, deviceId, score)
    return res.status(201).json(entry)
  } catch (err) {
    console.error('[POST /api/scores]', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/leaderboard/:gameSlug  (mounted at both /api/scores and /api/leaderboard)
router.get('/:gameSlug', async (req: Request, res: Response) => {
  const { gameSlug } = req.params
  if (!/^[a-z0-9-]+$/.test(gameSlug) || gameSlug.length > 64) {
    return res.status(400).json({ error: 'Invalid gameSlug' })
  }
  const limit = Math.min(parseInt(String(req.query.limit ?? '10'), 10) || 10, 100)
  try {
    const service = await getScoreService()
    const entries = await service.getLeaderboard(gameSlug, limit)
    return res.json(entries)
  } catch (err) {
    console.error('[GET /api/leaderboard]', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
