import { Router } from 'express'
import { z } from 'zod'
import { createRunToken } from '../runSecurity'

const router = Router()

const StartRunSchema = z.object({
  gameSlug: z.enum(['orbit-lock', 'lane-shift', 'echo-grid', 'gravity-flip']),
  deviceId: z.string().min(8).max(128),
})

router.post('/', (req, res) => {
  const parsed = StartRunSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid run request' })
  return res.status(201).json(createRunToken(parsed.data.gameSlug, parsed.data.deviceId))
})

export default router
