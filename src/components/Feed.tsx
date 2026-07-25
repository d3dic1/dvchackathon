import { useRef, useState, useEffect } from 'react'
import { GameMeta } from '../types/game'
import GameCard from './GameCard'
import JudgeCard from './JudgeCard'

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
          <span className="feed-brand__counter">
            {String((activeIndex % games.length) + 1).padStart(2, '0')} / {String(games.length).padStart(2, '0')}
          </span>
        </header>

        <div ref={containerRef} className="feed">
          {queue.map((game, index) => {
            const visible = Math.abs(index - activeIndex) <= 1
            return (
              <div
                className="feed__page"
                data-index={index}
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
                  />
                )}
              </div>
            )
          })}
        </div>

        <div className="swipe-cue" aria-hidden="true">
          <span>SWIPE FOR NEXT</span><i />
        </div>
      </section>
    </div>
  )
}
