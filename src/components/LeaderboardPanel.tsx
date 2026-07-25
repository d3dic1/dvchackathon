import { LeaderboardEntry } from '../types/game'

interface Props {
  entries: LeaderboardEntry[]
  loading: boolean
  onClose: () => void
  accentColor: string
  gameTitle: string
  /** Effective player identity resolved by the server: user_id (auth) or device_id (guest) */
  myPlayerId: string
  playerEntry: LeaderboardEntry | null
  totalPlayers: number
  error: string | null
  period: 'today' | 'all'
  onPeriodChange: (period: 'today' | 'all') => void
}

export default function LeaderboardPanel({
  entries, loading, onClose, accentColor, gameTitle, myPlayerId, playerEntry, totalPlayers, error,
  period, onPeriodChange,
}: Props) {
  const playerIsVisible = entries.some(entry => entry.deviceId === myPlayerId)

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
        <div className="leaderboard__tabs" aria-label="Leaderboard period">
          <button className={period === 'today' ? 'is-active' : ''} onClick={() => onPeriodChange('today')}>
            TODAY
          </button>
          <button className={period === 'all' ? 'is-active' : ''} onClick={() => onPeriodChange('all')}>
            ALL-TIME
          </button>
        </div>
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
            <span>{period === 'today' ? 'Finish a run to own today.' : 'Finish a run to take the first spot.'}</span>
          </div>
        ) : (
          <div className="leaderboard__list">
            {entries.map(entry => {
              const isMe = entry.deviceId === myPlayerId
              return (
                <LeaderboardRow key={`${entry.deviceId}-${entry.rank}`} entry={entry} isMe={isMe} />
              )
            })}
            {playerEntry && !playerIsVisible && (
              <>
                <div className="leaderboard__ellipsis">· · ·</div>
                <LeaderboardRow entry={playerEntry} isMe />
              </>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

function LeaderboardRow({ entry, isMe }: { entry: LeaderboardEntry; isMe: boolean }) {
  const handle = isMe
    ? 'YOU'
    : entry.displayName || `PLAYER ${entry.deviceId.slice(-4).toUpperCase()}`

  return (
    <div className={`leaderboard__row ${isMe ? 'is-me' : ''}`}>
      <span className="leaderboard__rank">{String(entry.rank).padStart(2, '0')}</span>
      <span className="leaderboard__player">
        {entry.avatarUrl && !isMe && (
          <img
            className="leaderboard__avatar"
            src={entry.avatarUrl}
            alt=""
            width="22"
            height="22"
            referrerPolicy="no-referrer"
          />
        )}
        {handle}
      </span>
      <strong>{entry.score}</strong>
    </div>
  )
}
