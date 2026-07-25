import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { GameMeta } from '../types/game'
import GameCard from './GameCard'
import JudgeCard from './JudgeCard'
import { DailyGauntletOverlay } from './DailyGauntletOverlay'
import { useFlickcadeAuth } from '../hooks/useFlickcadeAuth'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { usePersonalBest } from '../hooks/usePersonalBest'
import { useRunSession } from '../hooks/useRunSession'
import { getDeviceId } from '../utils/deviceId'
import {
  DAILY_GAUNTLET_LENGTH,
  DAILY_GAUNTLET_SLUG,
  getDailyGauntlet,
  getUtcDayKey,
  toGauntletPoints,
} from '../utils/dailyGauntlet'

interface Props {
  games: GameMeta[]
  soundEnabled: boolean
  onSoundToggle: () => void
  reducedMotion: boolean
}

function shuffled<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function buildQueue(games: GameMeta[], count: number): GameMeta[] {
  const result: GameMeta[] = [...games]
  while (result.length < count) result.push(...shuffled(games))
  return result.slice(0, count)
}

function prioritizeSharedGame(games: GameMeta[]): GameMeta[] {
  const target = new URLSearchParams(window.location.search).get('game')
  if (!target) return games
  const match = games.find(game => game.slug === target)
  return match ? [match, ...games.filter(game => game.slug !== target)] : games
}

const QUEUE_SIZE = 24

export default function Feed({ games, soundEnabled, onSoundToggle, reducedMotion }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [queue, setQueue] = useState(() => buildQueue(prioritizeSharedGame(games), QUEUE_SIZE))
  const dayKey = useMemo(() => getUtcDayKey(), [])
  const dailyGames = useMemo(() => getDailyGauntlet(games, dayKey), [dayKey, games])
  const deviceId = useRef(getDeviceId()).current
  const { getToken } = useFlickcadeAuth()
  const {
    entries: dailyEntries,
    playerEntry: dailyPlayerEntry,
    totalPlayers: dailyTotalPlayers,
    loading: dailyLoading,
    error: dailyError,
    submitScore: submitDailyScore,
    refresh: refreshDailyBoard,
  } = useLeaderboard(DAILY_GAUNTLET_SLUG, deviceId, getToken)
  const { personalBest: dailyBest, updatePersonalBest: updateDailyBest } =
    usePersonalBest(`${DAILY_GAUNTLET_SLUG}-${dayKey}`)
  const [gauntletActive, setGauntletActive] = useState(false)
  const [gauntletStage, setGauntletStage] = useState(0)
  const [gauntletScores, setGauntletScores] = useState<number[]>([])
  const [gauntletOverlay, setGauntletOverlay] = useState<'intro' | 'result' | null>(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('gauntlet') === dayKey ? 'intro' : null
  })
  const { getRunToken } = useRunSession(DAILY_GAUNTLET_SLUG, deviceId, gauntletActive)
  const challengeScore = (() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('gauntlet') === dayKey ? Number(params.get('beat')) || 0 : 0
  })()
  const bankedPoints = gauntletScores.reduce((total, points) => total + points, 0)

  useEffect(() => {
    if (dailyPlayerEntry?.score) updateDailyBest(dailyPlayerEntry.score)
  }, [dailyPlayerEntry, updateDailyBest])

  const startGauntlet = useCallback(() => {
    setQueue([...dailyGames, ...buildQueue(games, QUEUE_SIZE)])
    setActiveIndex(0)
    setGauntletStage(0)
    setGauntletScores([])
    setGauntletOverlay(null)
    setGauntletActive(true)
    requestAnimationFrame(() => containerRef.current?.scrollTo({ top: 0, behavior: 'auto' }))
  }, [dailyGames, games])

  const handleGauntletGameOver = useCallback((score: number) => {
    if (!gauntletActive || gauntletScores[gauntletStage] !== undefined) return
    const next = [...gauntletScores]
    next[gauntletStage] = toGauntletPoints(dailyGames[gauntletStage].slug, score)
    setGauntletScores(next)
    if (gauntletStage === DAILY_GAUNTLET_LENGTH - 1) {
      const total = next.reduce((sum, points) => sum + points, 0)
      updateDailyBest(total)
      void submitDailyScore(total, getRunToken())
    }
  }, [
    dailyGames,
    gauntletActive,
    gauntletScores,
    gauntletStage,
    getRunToken,
    submitDailyScore,
    updateDailyBest,
  ])

  const handleGauntletContinue = useCallback(() => {
    if (gauntletStage === DAILY_GAUNTLET_LENGTH - 1) {
      setGauntletActive(false)
      setGauntletOverlay('result')
      void refreshDailyBoard()
      return
    }
    const next = gauntletStage + 1
    setGauntletStage(next)
    containerRef.current?.children[next]?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' })
  }, [gauntletStage, reducedMotion, refreshDailyBoard])

  const shareGauntlet = useCallback(async () => {
    const url = new URL(window.location.origin)
    url.searchParams.set('gauntlet', dayKey)
    url.searchParams.set('beat', String(bankedPoints))
    const payload = {
      title: 'Daily Gauntlet · FLICKCADE',
      text: `I scored ${bankedPoints} in today's FLICKCADE Daily Gauntlet. Beat it.`,
      url: url.toString(),
    }
    try {
      if (navigator.share) await navigator.share(payload)
      else await navigator.clipboard.writeText(`${payload.text} ${payload.url}`)
    } catch {
      // Closing the native share sheet is not an error state.
    }
  }, [bankedPoints, dayKey])

  const closeGauntletOverlay = useCallback(() => setGauntletOverlay(null), [])

  useEffect(() => {
    if (activeIndex < queue.length - 6) return
    setQueue(current => [...current, ...buildQueue(games, 12)])
  }, [activeIndex, games, queue.length])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const cards = Array.from(container.children) as HTMLElement[]
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        const visibleCard = visible?.target as HTMLElement | undefined
        if (visibleCard?.dataset.index) setActiveIndex(Number(visibleCard.dataset.index))
      },
      { threshold: [0.55, 0.75, 0.95], root: container },
    )
    cards.forEach(card => observer.observe(card))
    return () => observer.disconnect()
  }, [queue.length])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const container = containerRef.current
      if (!container || !['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp'].includes(event.key)) return
      event.preventDefault()
      const direction = event.key.includes('Down') ? 1 : -1
      const next = Math.max(0, Math.min(activeIndex + direction, queue.length - 1))
      container.children[next]?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' })
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [activeIndex, queue.length, reducedMotion])

  return (
    <div className="feed-stage">
      <aside className="desktop-poster">
        <p className="desktop-poster__eyebrow">ONE THUMB / ENDLESS PLAY</p>
        <h1>FLICK<br />CADE</h1>
        <p className="desktop-poster__tagline">PLAY THE SCROLL.</p>
        <div className="desktop-poster__stamp">{String(games.length).padStart(2, '0')}<br /><span>GAMES</span></div>
        <p className="desktop-poster__hint">Swipe, score, repeat.<br />No lobby. No loading.</p>
        <JudgeCard gameCount={games.length} />
      </aside>

      <section className="phone-frame" aria-label="FLICKCADE game feed">
        <header className="feed-brand">
          <span className="feed-brand__name">FLICKCADE</span>
          <button
            className={`feed-brand__daily ${gauntletActive ? 'is-live' : ''}`}
            onClick={() => {
              if (!gauntletActive) setGauntletOverlay('intro')
            }}
            aria-label={gauntletActive ? `Daily gauntlet event ${gauntletStage + 1} of ${DAILY_GAUNTLET_LENGTH}` : 'Open Daily Gauntlet'}
          >
            {gauntletActive ? `${gauntletStage + 1}/${DAILY_GAUNTLET_LENGTH}` : 'DAILY'}
          </button>
          <span className="feed-brand__counter">
            {String((activeIndex % games.length) + 1).padStart(2, '0')} / {String(games.length).padStart(2, '0')}
          </span>
        </header>

        <div ref={containerRef} className={`feed ${gauntletActive ? 'feed--gauntlet' : ''}`}>
          {queue.map((game, index) => {
            const visible = Math.abs(index - activeIndex) <= 1
            const belongsToGauntlet = gauntletActive && index < DAILY_GAUNTLET_LENGTH
            const isCurrentGauntletCard = belongsToGauntlet && index === gauntletStage
            return (
              <div
                className={`feed__page ${index === activeIndex ? 'is-active' : ''}`}
                data-index={index}
                data-game={game.slug}
                key={`${game.slug}-${index}`}
              >
                {visible && (
                  <GameCard
                    game={game}
                    isActive={index === activeIndex}
                    soundEnabled={soundEnabled}
                    onSoundToggle={onSoundToggle}
                    reducedMotion={reducedMotion}
                    position={(index % games.length) + 1}
                    gauntlet={belongsToGauntlet ? {
                      stage: index,
                      totalStages: DAILY_GAUNTLET_LENGTH,
                      bankedPoints: gauntletScores
                        .slice(0, index)
                        .reduce((total, points) => total + points, 0),
                    } : undefined}
                    onGauntletGameOver={isCurrentGauntletCard ? handleGauntletGameOver : undefined}
                    onGauntletContinue={isCurrentGauntletCard ? handleGauntletContinue : undefined}
                  />
                )}
              </div>
            )
          })}
        </div>

        {!gauntletActive && (
          <div className="swipe-cue" aria-hidden="true">
            <span>SWIPE FOR NEXT</span><i />
          </div>
        )}

        {gauntletOverlay && (
          <DailyGauntletOverlay
            mode={gauntletOverlay}
            dayKey={dayKey}
            games={dailyGames}
            score={bankedPoints}
            personalBest={dailyBest}
            playerEntry={dailyPlayerEntry}
            entries={dailyEntries}
            totalPlayers={dailyTotalPlayers}
            challengeScore={challengeScore}
            loading={dailyLoading}
            error={dailyError}
            onStart={startGauntlet}
            onClose={closeGauntletOverlay}
            onShare={() => void shareGauntlet()}
          />
        )}
      </section>
    </div>
  )
}
