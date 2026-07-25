/**
 * useFlickcadeAuth — wraps Clerk auth for FLICKCADE.
 *
 * Two distinct hook functions are defined and one is chosen at module-load
 * time so React always sees the same hook call graph per component instance.
 *
 * - useClerkFlickcadeAuth  : selected when VITE_CLERK_PUBLISHABLE_KEY is set
 *                            (ClerkProvider is guaranteed to be in the tree)
 * - useGuestFlickcadeAuth  : selected otherwise — no Clerk context required
 */
import { useEffect } from 'react'
import { getDeviceId } from '../utils/deviceId'

// Static Clerk imports are safe: they are only *called* inside
// useClerkFlickcadeAuth, which is only exported when ClerkProvider is present.
// Importing the module itself has no side-effects.
import { useUser, useAuth } from '@clerk/clerk-react'

export const CLERK_ENABLED = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)

// Merge fires at most once per browser session regardless of hook consumers
let hasMergedThisSession = false
const nullGetToken = async (): Promise<string | null> => null

// ---------------------------------------------------------------------------
// Variant A — Clerk-backed (ClerkProvider must be in the tree)
// ---------------------------------------------------------------------------
function useClerkFlickcadeAuth() {
  const { user, isSignedIn, isLoaded } = useUser()
  const { getToken } = useAuth()

  useEffect(() => {
    if (!isSignedIn || !isLoaded || hasMergedThisSession) return
    hasMergedThisSession = true
    ;(async () => {
      try {
        const token = await getToken()
        if (!token) return
        const deviceId = getDeviceId()
        const resp = await fetch('/api/auth/merge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ deviceId }),
        })
        if (resp.ok) {
          const data = await resp.json() as { merged: number; displayName?: string }
          console.log(`[auth] Merged ${data.merged} guest scores → ${data.displayName ?? 'player'}`)
          window.dispatchEvent(new CustomEvent('flickcade:merged'))
        }
      } catch (err) {
        console.warn('[auth] Merge failed:', err)
        hasMergedThisSession = false // allow one retry
      }
    })()
  }, [isSignedIn, isLoaded, getToken])

  return {
    isLoaded,
    isSignedIn: isSignedIn ?? false,
    userId: user?.id ?? null,
    displayName: (user?.fullName || user?.username) ?? null,
    avatarUrl: user?.imageUrl ?? null,
    getToken,
  }
}

// ---------------------------------------------------------------------------
// Variant B — guest-only (no Clerk context required)
// ---------------------------------------------------------------------------
function useGuestFlickcadeAuth() {
  return {
    isLoaded: true,
    isSignedIn: false,
    userId: null as string | null,
    displayName: null as string | null,
    avatarUrl: null as string | null,
    getToken: nullGetToken,
  }
}

// ---------------------------------------------------------------------------
// Exported hook — identity fixed at module-load time, never varies per render
// ---------------------------------------------------------------------------
export const useFlickcadeAuth: () => ReturnType<typeof useClerkFlickcadeAuth> =
  CLERK_ENABLED ? useClerkFlickcadeAuth : (useGuestFlickcadeAuth as never)
