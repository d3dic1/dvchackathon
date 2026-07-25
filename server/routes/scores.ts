import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { getScoreService } from '../services/scoreService'
import { verifyRunToken } from '../runSecurity'

const router = Router()

const SCORE_LIMITS = {
  'orbit-lock': 250_000,
  'lane-shift': 100_000,
  'echo-grid': 250_000,
  'gravity-flip': 100_000,
} as const

const PostScoreSchema = z.object({
  gameSlug: z.enum(['orbit-lock', 'lane-shift', 'echo-grid', 'gravity-flip']),
  deviceId: z.string().min(8).max(128),
  score: z.number().int().min(0).max(9_999_999),
  runToken: z.string().min(32).max(2048),
}).superRefine(({ gameSlug, score }, context) => {
  if (score > SCORE_LIMITS[gameSlug]) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['score'], message: 'Score exceeds game limit' })
  }
})

// POST /api/scores
router.post('/', async (req: Request, res: Response) => {
  const parsed = PostScoreSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  }
  const { gameSlug, deviceId, score, runToken } = parsed.data
  const run = verifyRunToken(runToken, gameSlug, deviceId)
  if (!run) return res.status(403).json({ error: 'Invalid or expired run' })
  try {
    const service = await getScoreService()
    const entry = await service.saveScore(gameSlug, deviceId, score, run.runId)
    return res.status(201).json(entry)
  } catch (err) {
    if ((err as Error).message.includes('already submitted') || (err as { code?: string }).code === '23505') {
      return res.status(409).json({ error: 'Run already submitted' })
    }
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
    const deviceId = typeof req.query.deviceId === 'string' ? req.query.deviceId.slice(0, 128) : undefined
    const leaderboard = await service.getLeaderboard(gameSlug, limit, deviceId)
    return res.json(leaderboard)
  } catch (err) {
    console.error('[GET /api/leaderboard]', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
