import { useCallback, useEffect, useRef } from 'react'

export function useRunSession(gameSlug: string, deviceId: string, isActive: boolean) {
  const tokenRef = useRef('')
  const requestVersionRef = useRef(0)

  const startRun = useCallback(async () => {
    const requestVersion = ++requestVersionRef.current
    tokenRef.current = ''
    try {
      const response = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameSlug, deviceId }),
      })
      if (!response.ok) return
      const data = await response.json() as { runToken: string }
      if (requestVersionRef.current === requestVersion) tokenRef.current = data.runToken
    } catch {
      // Gameplay remains available offline; personal best still saves locally.
    }
  }, [deviceId, gameSlug])

  useEffect(() => {
    if (isActive) void startRun()
    else {
      requestVersionRef.current += 1
      tokenRef.current = ''
    }
    return () => {
      requestVersionRef.current += 1
    }
  }, [isActive, startRun])

  return {
    startRun,
    getRunToken: useCallback(() => tokenRef.current, []),
  }
}
