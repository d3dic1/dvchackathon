---
name: Clerk auth wiring
description: How Clerk v5 is wired into this Vite/ESM project without breaking React hook rules
---

**Rule:** Never use `require('@clerk/clerk-react')` inside hook or component bodies in Vite. Static ESM imports only.

**Why:** Vite bundles ESM; `require()` is not available at runtime in browser bundles. Calling it inside a hook body also risks React seeing different hook call counts if the module load fails.

**Pattern used:**
- Two hook variants defined (`useClerkFlickcadeAuth`, `useGuestFlickcadeAuth`)
- One is chosen at module-load time: `export const useFlickcadeAuth = CLERK_ENABLED ? clerkVariant : guestVariant`
- `CLERK_ENABLED = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)` — falsy when key absent
- `ClerkProvider` is only mounted in `main.tsx` when key is present (conditional JSX, not conditional import)
- Guest path: no Clerk hooks called at all, zero Clerk context needed
- Clerk path: `useUser()` + `useAuth()` are safe because `ClerkProvider` is guaranteed in tree

**ClerkProvider prop (v5.61.x):** Use `signInFallbackRedirectUrl` — NOT `afterSignInUrl` (deprecated) and NOT `fallbackRedirectUrl` (TypeScript error, wrong prop name for this version).

**Merge fires once per session:** Module-level `let hasMergedThisSession = false` guard prevents duplicate `POST /api/auth/merge` calls across re-renders.

**How to apply:** Any future Clerk hook addition must be inside `useClerkFlickcadeAuth` (the Clerk variant), never called conditionally or via dynamic import.
