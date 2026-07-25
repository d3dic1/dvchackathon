import { useState, useCallback, useRef, useEffect } from 'react'
import { GameMeta } from '../types/game'
import { usePersonalBest } from '../hooks/usePersonalBest'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { useFlickcadeAuth, CLERK_ENABLED } from '../hooks/useFlickcadeAuth'
import { getDeviceId } from '../utils/deviceId'
import { useRunSession } from '../hooks/useRunSession'
import ScoreHUD from './ScoreHUD'
import GameInfo from './GameInfo'
import GameOver from './GameOver'
import SocialRail from './SocialRail'
import LeaderboardPanel from './LeaderboardPanel'
import ClaimRankSheet from './ClaimRankSheet'

interface Props {
  game: GameMeta
  isActive: boolean
  soundEnabled: boolean
  onSoundToggle: () => void
  reducedMotion: boolean
  position: number
}

export default function GameCard({ game, isActive, soundEnabled, onSoundToggle, reducedMotion, position }: Props) {
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [finalScore, setFinalScore] = useState(0)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [liked, setLiked] = useState(false)
  const [key, setKey] = useState(0)
  const [milestone, setMilestone] = useState('')
  const [claimDismissed, setClaimDismissed] = useState(false)
  const milestoneLevel = useRef(0)
  const milestoneTimer = useRef<ReturnType<typeof setTimeout>>()
  const deviceId = useRef(getDeviceId()).current

  const { personalBest, updatePersonalBest } = usePersonalBest(game.slug)
  const { isSignedIn, getToken } = useFlickcadeAuth()
  const { entries, playerEntry, rivalEntry, totalPlayers, myPlayerId, loading, error, submitScore, refresh } =
    useLeaderboard(game.slug, deviceId, getToken)
  const { startRun, getRunToken } = useRunSession(game.slug, deviceId, isActive)

  useEffect(() => {
    if (isActive) {
      setScore(0)
      setGameOver(false)
      setFinalScore(0)
      setMilestone('')
      milestoneLevel.current = 0
    }
  }, [isActive])

  useEffect(() => () => clearTimeout(milestoneTimer.current), [])

  // Reset claim sheet on each new run so it can reappear after a great score
  useEffect(() => {
    if (!gameOver) setClaimDismissed(false)
  }, [gameOver])

  const handleScore = useCallback((s: number) => {
    setScore(s)
    const thresholds: Record<string, number> = {
      'orbit-lock': 50, 'lane-shift': 8, 'echo-grid': 100, 'gravity-flip': 8,
    }
    const level = Math.floor(s / thresholds[game.slug])
    if (level > milestoneLevel.current) {
      milestoneLevel.current = level
      setMilestone(level >= 3 ? 'UNSTOPPABLE!' : level >= 2 ? 'ON FIRE!' : 'HEATING UP!')
      clearTimeout(milestoneTimer.current)
      milestoneTimer.current = setTimeout(() => setMilestone(''), 850)
    }
  }, [game.slug])

  const handleGameOver = useCallback((s: number) => {
    setFinalScore(s)
    setGameOver(true)
    updatePersonalBest(s)
    void submitScore(s, getRunToken())
  }, [getRunToken, updatePersonalBest, submitScore])

  const handlePlayAgain = useCallback(() => {
    setScore(0)
    setGameOver(false)
    setFinalScore(0)
    setKey(k => k + 1)
    void startRun()
  }, [startRun])

  const handleLeaderboard = useCallback(() => {
    refresh()
    setShowLeaderboard(true)
  }, [refresh])

  const isNewBest = finalScore > 0 && finalScore >= personalBest

  const GameComponent = game.component
  const challengeScore = (() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('game') === game.slug ? Number(params.get('beat')) || 0 : 0
  })()

  // Show ClaimRankSheet when: Clerk configured, game over, positive score, not signed in, not dismissed
  const showClaimSheet = CLERK_ENABLED && gameOver && finalScore > 0 && !isSignedIn && !claimDismissed && !showLeaderboard

  return (
    <article className={`game-card ${milestone ? 'is-impact' : ''}`} data-game={game.slug}>
      <div className="game-card__texture" />
      <div className="game-card__number" aria-hidden="true">{String(position).padStart(2, '0')}</div>
      <div className="game-card__era" aria-hidden="true">LIVING ROOM CLASSIC · HARD MODE</div>

      <GameComponent
        key={key}
        isActive={isActive && !gameOver}
        onScore={handleScore}
        onGameOver={handleGameOver}
        soundEnabled={soundEnabled}
        reducedMotion={reducedMotion}
      />

      {!showLeaderboard && (
        <ScoreHUD
          score={gameOver ? finalScore : score}
          personalBest={personalBest}
          accentColor={game.accentColor}
          rivalScore={rivalEntry?.score}
        />
      )}

      {!gameOver && !showLeaderboard && (
        <GameInfo title={game.title} instruction={game.instruction} accentColor={game.accentColor} />
      )}

      {!showLeaderboard && (
        <SocialRail
          soundEnabled={soundEnabled}
          onSoundToggle={onSoundToggle}
          onLeaderboard={handleLeaderboard}
          liked={liked}
          onLike={() => setLiked(l => !l)}
          accentColor={game.accentColor}
          gameSlug={game.slug}
          gameTitle={game.title}
          score={gameOver ? finalScore : score}
        />
      )}

      {challengeScore > 0 && !gameOver && !showLeaderboard && (
        <div className="challenge-target">CHALLENGE · BEAT {challengeScore}</div>
      )}
      {milestone && !gameOver && <div className="milestone-burst">{milestone}</div>}

      {gameOver && !showLeaderboard && (
        <GameOver
          score={finalScore}
          personalBest={personalBest}
          isNewBest={isNewBest}
          onPlayAgain={handlePlayAgain}
          accentColor={game.accentColor}
          rank={playerEntry?.rank}
          totalPlayers={totalPlayers}
          challengeScore={challengeScore}
        />
      )}

      {/* Claim-rank sheet slides up over the game-over card for non-signed-in players */}
      {showClaimSheet && (
        <ClaimRankSheet
          score={finalScore}
          rank={playerEntry?.rank}
          totalPlayers={totalPlayers}
          accentColor={game.accentColor}
          onDismiss={() => setClaimDismissed(true)}
        />
      )}

      {showLeaderboard && (
        <LeaderboardPanel
          entries={entries}
          loading={loading}
          onClose={() => setShowLeaderboard(false)}
          accentColor={game.accentColor}
          gameTitle={game.title}
          myPlayerId={myPlayerId}
          playerEntry={playerEntry}
          totalPlayers={totalPlayers}
          error={error}
        />
      )}
    </article>
  )
}
