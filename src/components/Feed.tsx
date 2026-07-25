import { useRef, useState, useEffect, useCallback } from 'react'
import { GameMeta } from '../types/game'
import GameCard from './GameCard'

interface Props {
  games: GameMeta[]
  soundEnabled: boolean
  onSoundToggle: () => void
  reducedMotion: boolean
}

// Shuffle utility
function shuffled<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Build a "virtual" infinite list by recycling shuffled decks
function buildQueue(games: GameMeta[], count: number): GameMeta[] {
  const result: GameMeta[] = []
  while (result.length < count) {
    result.push(...shuffled(games))
  }
  return result.slice(0, count)
}

const QUEUE_SIZE = 20

export default function Feed({ games, soundEnabled, onSoundToggle, reducedMotion }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [queue] = useState(() => buildQueue(games, QUEUE_SIZE))

  // Use IntersectionObserver to detect which card is visible
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const cards = Array.from(container.children) as HTMLElement[]
    const observers: IntersectionObserver[] = []

    cards.forEach((card, i) => {
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            setActiveIndex(i)
          }
        },
        { threshold: 0.6, root: container }
      )
      obs.observe(card)
      observers.push(obs)
    })

    return () => observers.forEach(o => o.disconnect())
  }, [queue.length])

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const container = containerRef.current
      if (!container) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const next = Math.min(activeIndex + 1, queue.length - 1)
        container.children[next]?.scrollIntoView({ behavior: 'smooth' })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const prev = Math.max(activeIndex - 1, 0)
        container.children[prev]?.scrollIntoView({ behavior: 'smooth' })
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [activeIndex, queue.length])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        overflowY: 'scroll',
        scrollSnapType: 'y mandatory',
        WebkitOverflowScrolling: 'touch',
        scrollBehavior: 'smooth',
        // hide scrollbar
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      <style>{`
        div::-webkit-scrollbar { display: none; }
      `}</style>

      {queue.map((game, i) => {
        // Only render cards near the active one to save memory
        const visible = Math.abs(i - activeIndex) <= 1
        return (
          <div
            key={`${game.slug}-${i}`}
            style={{
              width: '100%',
              height: '100%',
              scrollSnapAlign: 'start',
              scrollSnapStop: 'always',
              flexShrink: 0,
              position: 'relative',
            }}
          >
            {visible && (
              <GameCard
                game={game}
                isActive={i === activeIndex}
                soundEnabled={soundEnabled}
                onSoundToggle={onSoundToggle}
                reducedMotion={reducedMotion}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
