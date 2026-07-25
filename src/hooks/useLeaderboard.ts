import { useState, useEffect, useCallback } from 'react'
import { LeaderboardData, LeaderboardEntry } from '../types/game'
import {
  flushScoreQueue,
  pendingScoreCount,
  queueScore,
  subscribeToScoreQueue,
} from '../utils/offlineScores'

export function useLeaderboard(
  gameSlug: string,
  deviceId: string,
  getClerkToken?: () => Promise<string | null>,
) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [playerEntry, setPlayerEntry] = useState<LeaderboardEntry | null>(null)
  const [rivalEntry, setRivalEntry] = useState<LeaderboardEntry | null>(null)
  const [totalPlayers, setTotalPlayers] = useState(0)
  const [myPlayerId, setMyPlayerId] = useState(deviceId)
  const [allTimeBest, setAllTimeBest] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<'today' | 'all'>('today')
  const [pendingScores, setPendingScores] = useState(pendingScoreCount)

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ deviceId, period })
      const headers: Record<string, string> = {}
      try {
        const token = await getClerkToken?.()
        if (token) headers.Authorization = `Bearer ${token}`
      } catch { /* guest leaderboard remains available */ }
      const response = await window.fetch(`/api/leaderboard/${gameSlug}?${params}`, { headers })
      if (!response.ok) throw new Error('Leaderboard unavailable')
      const data = await response.json() as LeaderboardData
      setEntries(data.entries)
      setPlayerEntry(data.playerEntry)
      setRivalEntry(data.rivalEntry)
      setTotalPlayers(data.totalPlayers)
      setMyPlayerId(data.myPlayerId ?? deviceId)
      setAllTimeBest(data.allTimeBest)
    } catch {
      setError('Ranks are offline. Your best is still saved here.')
    } finally {
      setLoading(false)
    }
  }, [deviceId, gameSlug, getClerkToken, period])

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  useEffect(() => {
    const sync = async () => {
      const remaining = await flushScoreQueue(getClerkToken)
      setPendingScores(remaining)
      if (remaining === 0) await fetchLeaderboard()
    }
    const unsubscribe = subscribeToScoreQueue(setPendingScores)
    window.addEventListener('online', sync)
    if (navigator.onLine && pendingScoreCount() > 0) void sync()
    return () => {
      unsubscribe()
      window.removeEventListener('online', sync)
    }
  }, [fetchLeaderboard, getClerkToken])

  // Re-fetch after a guest→auth merge so the leaderboard shows the real handle
  useEffect(() => {
    const handler = () => void fetchLeaderboard()
    window.addEventListener('flickcade:merged', handler)
    return () => window.removeEventListener('flickcade:merged', handler)
  }, [fetchLeaderboard])

  const submitScore = useCallback(async (score: number, runToken: string) => {
    if (!runToken) {
      setError('Score saved locally. World ranks are offline.')
      return false
    }
    try {
      // Attach Clerk session token when available so the server links the score to the account
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      try {
        const token = await getClerkToken?.()
        if (token) headers['Authorization'] = `Bearer ${token}`
      } catch { /* non-fatal */ }

      const response = await window.fetch('/api/scores', {
        method: 'POST',
        headers,
        body: JSON.stringify({ gameSlug, score, deviceId, runToken }),
      })
      if (!response.ok) {
        if (response.status >= 500 || response.status === 429) {
          queueScore({ gameSlug, score, deviceId, runToken, queuedAt: Date.now() })
          setError('Score queued. It will sync when you are back online.')
          return true
        }
        setError('This run could not be verified. Your local best is safe.')
        return false
      }
      await fetchLeaderboard()
      return true
    } catch {
      queueScore({ gameSlug, score, deviceId, runToken, queuedAt: Date.now() })
      setError('Score queued. It will sync when you are back online.')
      return true
    }
  }, [deviceId, fetchLeaderboard, gameSlug, getClerkToken])

  return {
    entries,
    playerEntry,
    rivalEntry,
    totalPlayers,
    myPlayerId,
    allTimeBest,
    period,
    setPeriod,
    pendingScores,
    loading,
    error,
    submitScore,
    refresh: fetchLeaderboard,
  }
}
