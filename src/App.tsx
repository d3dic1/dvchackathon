import { useState, useEffect } from 'react'
import { GameMeta } from './types/game'
import Feed from './components/Feed'
import OrbitLock from './games/OrbitLock'
import LaneShift from './games/LaneShift'
import EchoGrid from './games/EchoGrid'
import GravityFlip from './games/GravityFlip'

const GAMES: GameMeta[] = [
  {
    slug: 'orbit-lock',
    title: 'Power Swing',
    instruction: 'Tap in the sweet spot. Every hit speeds up.',
    accentColor: '#ff5b35',
    component: OrbitLock,
  },
  {
    slug: 'lane-shift',
    title: 'Slalom Panic',
    instruction: 'Tap to carve lanes. One gate ends the run.',
    accentColor: '#78d8ff',
    component: LaneShift,
  },
  {
    slug: 'echo-grid',
    title: 'Party Pattern',
    instruction: 'Copy the pattern. It gets fast, fast.',
    accentColor: '#ffd83d',
    component: EchoGrid,
  },
  {
    slug: 'gravity-flip',
    title: 'Skybound',
    instruction: 'Tap to swap sides. Survive the toy course.',
    accentColor: '#8cff69',
    component: GravityFlip,
  },
]

export default function App() {
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <main className="app-shell">
      <Feed
        games={GAMES}
        soundEnabled={soundEnabled}
        onSoundToggle={() => setSoundEnabled(s => !s)}
        reducedMotion={reducedMotion}
      />
    </main>
  )
}
