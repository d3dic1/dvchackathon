import { useEffect, useRef } from 'react'

interface Props {
  score: number
  personalBest: number
  isNewBest: boolean
  onPlayAgain: () => void
  accentColor: string
  rank?: number
  totalPlayers: number
  challengeScore?: number
}

export default function GameOver({
  score, personalBest, isNewBest, onPlayAgain, accentColor, rank, totalPlayers, challengeScore,
}: Props) {
  const challengeWon = Boolean(challengeScore && score > challengeScore)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => buttonRef.current?.focus(), 120)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="game-over" onClick={event => event.stopPropagation()}>
      <div className="game-over__card" style={{ '--accent': accentColor } as React.CSSProperties}>
        <div className="game-over__tape">
          {challengeWon ? 'CHALLENGE CRUSHED' : isNewBest ? 'NEW HIGH SCORE' : 'RUN COMPLETE'}
        </div>
        <div className="game-over__score">{score}</div>
        <div className="game-over__stats">
          <Stat label="Your best" value={personalBest} />
          <Stat
            label={rank && totalPlayers ? `Top ${Math.max(1, Math.ceil(rank / totalPlayers * 100))}%` : 'World rank'}
            value={score === 0 ? 'UNRANKED' : rank ? `#${rank}` : 'SYNCING'}
          />
        </div>
        {rank && totalPlayers > 0 && (
          <div className="game-over__percentile">
            YOU BEAT {Math.max(0, Math.floor((totalPlayers - rank) / totalPlayers * 100))}% OF PLAYERS
          </div>
        )}
        {challengeWon && <div className="game-over__challenge">YOU BEAT {challengeScore} BY {score - (challengeScore ?? 0)}</div>}
        <button ref={buttonRef} className="game-over__button" onClick={onPlayAgain}>
          PLAY IT AGAIN <span>↗</span>
        </button>
        <p>Or swipe up for a different game.</p>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}
