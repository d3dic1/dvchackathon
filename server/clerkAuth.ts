/**
 * Clerk auth helpers for Express.
 *
 * @clerk/backend v5: verifyToken() is a standalone export, not a method on
 * the ClerkClient object. createClerkClient() is used only for user-info calls
 * (clerk.users.getUser).
 */
import { verifyToken, createClerkClient } from '@clerk/backend'
import type { Request, Response, NextFunction } from 'express'

declare global {
  namespace Express {
    interface Request {
      auth: { userId: string } | null
    }
  }
}

let _clerk: ReturnType<typeof createClerkClient> | null = null

/** Returns a Clerk admin client for fetching user data (not for token verification). */
export function getClerk() {
  if (!_clerk) {
    const secretKey = process.env.CLERK_SECRET_KEY
    if (!secretKey) return null
    _clerk = createClerkClient({ secretKey })
  }
  return _clerk
}

/** Populates req.auth from a valid Bearer token. Never rejects unauthenticated requests. */
export async function optionalClerkAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    req.auth = null
    return next()
  }
  const token = authHeader.slice(7)
  const secretKey = process.env.CLERK_SECRET_KEY
  if (!secretKey) {
    req.auth = null
    return next()
  }
  try {
    // verifyToken is a standalone function in @clerk/backend v5
    const payload = await verifyToken(token, { secretKey })
    req.auth = { userId: payload.sub }
  } catch {
    req.auth = null
  }
  next()
}

/** Rejects with 401 when no valid Clerk token is present. */
export async function requireClerkAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  await optionalClerkAuth(req, res, () => {})
  if (!req.auth) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }
  next()
}
