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
  onRevenge?: () => void
  gauntlet?: {
    round: number
    totalRounds: number
    eventPoints: number
    bankedPoints: number
    isFinal: boolean
    onContinue: () => void
  }
}

export default function GameOver({
  score, personalBest, isNewBest, onPlayAgain, accentColor, rank, totalPlayers, challengeScore, onRevenge,
  gauntlet,
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
          {gauntlet
            ? `EVENT ${gauntlet.round}/${gauntlet.totalRounds} COMPLETE`
            : challengeWon
              ? 'CHALLENGE CRUSHED'
              : isNewBest ? 'NEW HIGH SCORE' : 'RUN COMPLETE'}
        </div>
        <div className="game-over__score">{score}</div>
        <div className="game-over__stats">
          {gauntlet ? (
            <>
              <Stat label="Event points" value={gauntlet.eventPoints} />
              <Stat label="Run total" value={gauntlet.bankedPoints + gauntlet.eventPoints} />
            </>
          ) : (
            <>
              <Stat label="Your best" value={personalBest} />
              <Stat
                label={rank && totalPlayers ? `Top ${Math.max(1, Math.ceil(rank / totalPlayers * 100))}%` : 'World rank'}
                value={score === 0 ? 'UNRANKED' : rank ? `#${rank}` : 'SYNCING'}
              />
            </>
          )}
        </div>
        {!gauntlet && rank && totalPlayers > 0 && (
          <div className="game-over__percentile">
            YOU BEAT {Math.max(0, Math.floor((totalPlayers - rank) / totalPlayers * 100))}% OF PLAYERS
          </div>
        )}
        {!gauntlet && challengeWon && <div className="game-over__challenge">YOU BEAT {challengeScore} BY {score - (challengeScore ?? 0)}</div>}
        {!gauntlet && challengeWon && onRevenge && (
          <button className="game-over__revenge" onClick={onRevenge}>
            SEND IT BACK <span>↗</span>
          </button>
        )}
        <button
          ref={buttonRef}
          className="game-over__button"
          onClick={gauntlet ? gauntlet.onContinue : onPlayAgain}
        >
          {gauntlet ? gauntlet.isFinal ? 'VIEW DAILY RESULT' : 'NEXT EVENT' : 'PLAY IT AGAIN'} <span>↗</span>
        </button>
        <p>{gauntlet ? 'One life banked. No rewinds.' : 'Or swipe up for a different game.'}</p>
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
