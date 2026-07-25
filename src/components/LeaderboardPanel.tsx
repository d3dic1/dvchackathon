import { LeaderboardEntry } from '../types/game'

interface Props {
  entries: LeaderboardEntry[]
  loading: boolean
  onClose: () => void
  accentColor: string
  gameTitle: string
  deviceId: string
  playerEntry: LeaderboardEntry | null
  totalPlayers: number
  error: string | null
}

export default function LeaderboardPanel({
  entries, loading, onClose, accentColor, gameTitle, deviceId, playerEntry, totalPlayers, error,
}: Props) {
  const playerIsVisible = entries.some(entry => entry.deviceId === deviceId)

  return (
    <div className="leaderboard" onClick={onClose}>
      <section className="leaderboard__sheet" onClick={event => event.stopPropagation()}>
        <header>
          <div>
            <span>LIVE WORLD RANKING · {totalPlayers} PLAYERS</span>
            <h2>{gameTitle}</h2>
          </div>
          <button onClick={onClose} aria-label="Close leaderboard">×</button>
        </header>
        <div className="leaderboard__rule" style={{ background: accentColor }} />

        {loading && entries.length === 0 ? (
          <div className="leaderboard__empty">Pulling scores...</div>
        ) : error && entries.length === 0 ? (
          <div className="leaderboard__empty leaderboard__empty--error">
            <strong>RANKS ARE OFFLINE.</strong>
            <span>{error}</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="leaderboard__empty">
            <strong>THE BOARD IS WIDE OPEN.</strong>
            <span>Finish a run to take the first spot.</span>
          </div>
        ) : (
          <div className="leaderboard__list">
            {entries.map(entry => {
              const isMe = entry.deviceId === deviceId
              return (
                <div className={`leaderboard__row ${isMe ? 'is-me' : ''}`} key={`${entry.deviceId}-${entry.rank}`}>
                  <span className="leaderboard__rank">{String(entry.rank).padStart(2, '0')}</span>
                  <span className="leaderboard__player">{isMe ? 'YOU' : `PLAYER ${entry.deviceId.slice(-4).toUpperCase()}`}</span>
                  <strong>{entry.score}</strong>
                </div>
              )
            })}
            {playerEntry && !playerIsVisible && (
              <>
                <div className="leaderboard__ellipsis">· · ·</div>
                <div className="leaderboard__row is-me">
                  <span className="leaderboard__rank">{String(playerEntry.rank).padStart(2, '0')}</span>
                  <span className="leaderboard__player">YOU</span>
                  <strong>{playerEntry.score}</strong>
                </div>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
