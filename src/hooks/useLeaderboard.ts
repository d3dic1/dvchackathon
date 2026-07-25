import { useState, useEffect, useCallback } from 'react'
import { LeaderboardData, LeaderboardEntry } from '../types/game'

export function useLeaderboard(gameSlug: string, deviceId: string) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [playerEntry, setPlayerEntry] = useState<LeaderboardEntry | null>(null)
  const [totalPlayers, setTotalPlayers] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ deviceId })
      const response = await window.fetch(`/api/leaderboard/${gameSlug}?${params}`)
      if (!response.ok) throw new Error('Leaderboard unavailable')
      const data = await response.json() as LeaderboardData
      setEntries(data.entries)
      setPlayerEntry(data.playerEntry)
      setTotalPlayers(data.totalPlayers)
    } catch {
      setError('Ranks are offline. Your best is still saved here.')
    } finally {
      setLoading(false)
    }
  }, [deviceId, gameSlug])

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  const submitScore = useCallback(async (score: number) => {
    try {
      const response = await window.fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameSlug, score, deviceId }),
      })
      if (!response.ok) throw new Error('Score rejected')
      await fetchLeaderboard()
      return true
    } catch {
      setError('Score saved locally. World ranks are offline.')
      return false
    }
  }, [deviceId, fetchLeaderboard, gameSlug])

  return {
    entries,
    playerEntry,
    totalPlayers,
    loading,
    error,
    submitScore,
    refresh: fetchLeaderboard,
  }
}
