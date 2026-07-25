import { Router } from 'express'
import { z } from 'zod'
import { requireClerkAuth, getClerk } from '../clerkAuth'
import { getScoreService } from '../services/scoreService'

const router = Router()

const MergeSchema = z.object({
  deviceId: z.string().min(8).max(128),
})

/**
 * POST /api/auth/merge
 * Re-attributes all guest scores from `deviceId` to the authenticated Clerk user.
 * Idempotent — safe to call multiple times.
 * Requires Authorization: Bearer <clerk-session-token>
 */
router.post('/merge', requireClerkAuth, async (req, res) => {
  const parsed = MergeSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid payload' })
    return
  }
  const { deviceId } = parsed.data
  const { userId } = req.auth!

  // Fetch authoritative display info from Clerk (never trust client-supplied values for identity)
  let displayName: string | undefined
  let avatarUrl: string | undefined
  try {
    const clerk = getClerk()
    if (clerk) {
      const user = await clerk.users.getUser(userId)
      const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ')
      displayName =
        fullName ||
        user.username ||
        user.emailAddresses[0]?.emailAddress?.split('@')[0] ||
        'Player'
      avatarUrl = user.imageUrl || undefined
    }
  } catch (err) {
    console.warn('[auth/merge] Could not fetch Clerk user info:', (err as Error).message)
  }

  try {
    const service = await getScoreService()
    const merged = await service.mergeGuestScores(deviceId, userId, displayName, avatarUrl)
    res.json({ merged, userId, displayName })
  } catch (err) {
    console.error('[POST /api/auth/merge]', err)
    res.status(500).json({ error: 'Merge failed' })
  }
})

export default router
