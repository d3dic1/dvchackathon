import { useEffect, useRef } from 'react'
import { GameMeta, LeaderboardEntry } from '../types/game'
import { formatGauntletDate } from '../utils/dailyGauntlet'

interface DailyGauntletOverlayProps {
  mode: 'intro' | 'result'
  dayKey: string
  games: GameMeta[]
  score: number
  personalBest: number
  playerEntry: LeaderboardEntry | null
  entries: LeaderboardEntry[]
  totalPlayers: number
  challengeScore: number
  loading: boolean
  error: string | null
  onStart: () => void
  onClose: () => void
  onShare: () => void
}

export function DailyGauntletOverlay({
  mode,
  dayKey,
  games,
  score,
  personalBest,
  playerEntry,
  entries,
  totalPlayers,
  challengeScore,
  loading,
  error,
  onStart,
  onClose,
  onShare,
}: DailyGauntletOverlayProps) {
  const primaryRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => primaryRef.current?.focus(), 120)
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', handleKey)
    }
  }, [mode, onClose])

  const challengeWon = challengeScore > 0 && score > challengeScore

  return (
    <div className="gauntlet-overlay" role="dialog" aria-modal="true" aria-labelledby="gauntlet-title">
      <section className="gauntlet-ticket">
        <button className="gauntlet-ticket__close" onClick={onClose} aria-label="Close daily gauntlet">
          ×
        </button>
        <div className="gauntlet-ticket__date">{formatGauntletDate(dayKey)} · WORLDWIDE</div>

        {mode === 'intro' ? (
          <>
            <p className="gauntlet-ticket__eyebrow">THREE GAMES · ONE LIFE EACH</p>
            <h2 id="gauntlet-title">DAILY<br />GAUNTLET</h2>
            {challengeScore > 0 && (
              <div className="gauntlet-ticket__challenge">RIVAL SCORE · {challengeScore}</div>
            )}
            <ol className="gauntlet-lineup">
              {games.map((game, index) => (
                <li key={game.slug}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{game.title}</strong>
                </li>
              ))}
            </ol>
            <p className="gauntlet-ticket__rule">
              Same lineup for everyone. Scores are equalized to 1,000 points per event.
            </p>
            <button ref={primaryRef} className="gauntlet-ticket__primary" onClick={onStart}>
              START TODAY’S RUN <span>→</span>
            </button>
            {personalBest > 0 && <p className="gauntlet-ticket__best">TODAY’S BEST · {personalBest}</p>}
          </>
        ) : (
          <>
            <p className="gauntlet-ticket__eyebrow">
              {challengeWon ? 'RIVAL SCORE DESTROYED' : 'TODAY’S RUN COMPLETE'}
            </p>
            <h2 id="gauntlet-title" className="gauntlet-ticket__result">{score}</h2>
            <div className="gauntlet-result-meta">
              <div>
                <strong>{playerEntry ? `#${playerEntry.rank}` : loading ? '···' : '—'}</strong>
                <span>DAILY RANK</span>
              </div>
              <div>
                <strong>{personalBest}</strong>
                <span>TODAY’S BEST</span>
              </div>
            </div>
            {playerEntry && totalPlayers > 0 && (
              <p className="gauntlet-ticket__percentile">
                YOU BEAT {Math.max(0, Math.floor((totalPlayers - playerEntry.rank) / totalPlayers * 100))}% TODAY
              </p>
            )}
            <div className="gauntlet-podium" aria-label="Daily gauntlet leaders">
              {entries.slice(0, 3).map(entry => (
                <div className={entry.deviceId === playerEntry?.deviceId ? 'is-me' : ''} key={entry.deviceId}>
                  <span>#{entry.rank}</span>
                  <strong>{entry.displayName || `PLAYER ${entry.deviceId.slice(-4).toUpperCase()}`}</strong>
                  <b>{entry.score}</b>
                </div>
              ))}
              {!loading && entries.length === 0 && <p>FIRST RUN ON THE BOARD. SET THE TARGET.</p>}
            </div>
            {error && <p className="gauntlet-ticket__error">{error}</p>}
            <button ref={primaryRef} className="gauntlet-ticket__primary" onClick={onShare}>
              CHALLENGE A FRIEND <span>↗</span>
            </button>
            <button className="gauntlet-ticket__secondary" onClick={onStart}>RUN IT AGAIN</button>
          </>
        )}
      </section>
    </div>
  )
}
