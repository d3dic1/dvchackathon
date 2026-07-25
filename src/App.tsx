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
    title: 'Orbit Lock',
    instruction: 'Tap when the marker hits the glowing zone.',
    accentColor: '#c8ff00',
    component: OrbitLock,
  },
  {
    slug: 'lane-shift',
    title: 'Lane Shift',
    instruction: 'Tap to switch lanes and dodge barriers.',
    accentColor: '#9b5de5',
    component: LaneShift,
  },
  {
    slug: 'echo-grid',
    title: 'Echo Grid',
    instruction: 'Repeat the flashing sequence on the pads.',
    accentColor: '#00e5ff',
    component: EchoGrid,
  },
  {
    slug: 'gravity-flip',
    title: 'Gravity Flip',
    instruction: 'Tap to flip gravity and dodge obstacles.',
    accentColor: '#9b5de5',
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
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', background: '#0a0a0f' }}>
      <Feed
        games={GAMES}
        soundEnabled={soundEnabled}
        onSoundToggle={() => setSoundEnabled(s => !s)}
        reducedMotion={reducedMotion}
      />
    </div>
  )
}
