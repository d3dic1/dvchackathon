import { useState, useEffect, useCallback } from 'react'
import { LeaderboardEntry } from '../types/game'

export function useLeaderboard(gameSlug: string) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await window.fetch(`/api/leaderboard/${gameSlug}`)
      if (res.ok) {
        const data = await res.json()
        setEntries(data)
      }
    } catch {
      // silently ignore — offline/unavailable
    } finally {
      setLoading(false)
    }
  }, [gameSlug])

  useEffect(() => {
    fetch()
  }, [fetch])

  const submitScore = useCallback(async (score: number, deviceId: string) => {
    try {
      await window.fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameSlug, score, deviceId }),
      })
      fetch()
    } catch {
      // silently ignore
    }
  }, [gameSlug, fetch])

  return { entries, loading, submitScore, refresh: fetch }
}
