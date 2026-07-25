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
import { shareChallenge } from '../utils/shareChallenge'
import { playSound } from '../utils/audio'

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
  const { isSignedIn, displayName, getToken } = useFlickcadeAuth()
  const {
    entries, playerEntry, rivalEntry, totalPlayers, myPlayerId, allTimeBest, period, setPeriod,
    pendingScores, loading, error, submitScore, refresh,
  } =
    useLeaderboard(game.slug, deviceId, getToken)
  const { startRun, getRunToken } = useRunSession(game.slug, deviceId, isActive)

  // Seed local personal-best from server so signed-in users see cross-device best immediately
  useEffect(() => {
    if (allTimeBest > 0) {
      updatePersonalBest(allTimeBest)
    }
  }, [allTimeBest, updatePersonalBest])

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
      'orbit-lock': 50,
      'lane-shift': 8,
      'echo-grid': 100,
      'gravity-flip': 8,
      'micro-mayhem': 250,
      'cannon-dash': 150,
      'rail-blaster': 250,
    }
    const threshold = thresholds[game.slug]
    if (!threshold) return
    const level = Math.floor(s / threshold)
    if (level > milestoneLevel.current) {
      milestoneLevel.current = level
      setMilestone(level >= 3 ? 'UNSTOPPABLE!' : level >= 2 ? 'ON FIRE!' : 'HEATING UP!')
      playSound('milestone', soundEnabled)
      clearTimeout(milestoneTimer.current)
      milestoneTimer.current = setTimeout(() => setMilestone(''), 850)
    }
  }, [game.slug, soundEnabled])

  const handleGameOver = useCallback((s: number) => {
    setFinalScore(s)
    setGameOver(true)
    updatePersonalBest(s)
    void submitScore(s, getRunToken())
    const params = new URLSearchParams(window.location.search)
    const challengeTarget = params.get('game') === game.slug ? Number(params.get('beat')) || 0 : 0
    if (challengeTarget > 0 && s > challengeTarget) playSound('challenge', soundEnabled)
  }, [game.slug, getRunToken, soundEnabled, updatePersonalBest, submitScore])

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
  const challengeFrom = (() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('game') === game.slug ? params.get('from') : null
  })()

  // ClaimRankSheet: show only when Clerk is configured, run is over, score > 0, not signed in, not dismissed
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
          challenger={displayName}
        />
      )}

      {challengeScore > 0 && !gameOver && !showLeaderboard && (
        <div className="challenge-target">
          {challengeFrom ? `${challengeFrom.toUpperCase()} SAYS · ` : 'CHALLENGE · '}BEAT {challengeScore}
        </div>
      )}
      {rivalEntry && !gameOver && !showLeaderboard && (
        <div className="rival-target">
          <span>NEXT RIVAL · {rivalEntry.score + 1}</span>
          <div className="rival-target__meter">
            <i style={{ width: `${Math.min(100, score / (rivalEntry.score + 1) * 100)}%` }} />
            <b aria-hidden="true">◆</b>
          </div>
        </div>
      )}
      {milestone && !gameOver && <div className="milestone-burst">{milestone}</div>}
      {pendingScores > 0 && !showLeaderboard && (
        <div className="sync-badge">OFFLINE SCORE SAVED · {pendingScores} TO SYNC</div>
      )}

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
          onRevenge={() => void shareChallenge({
            gameSlug: game.slug,
            gameTitle: game.title,
            score: finalScore,
            challenger: displayName,
            revenge: true,
          })}
        />
      )}

      {/* Bottom sheet: offer sign-in only after a worthwhile completed run */}
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
          period={period}
          onPeriodChange={setPeriod}
        />
      )}
    </article>
  )
}
