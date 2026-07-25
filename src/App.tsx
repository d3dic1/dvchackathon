import { useState, useEffect } from 'react'
import { GameMeta } from './types/game'
import Feed from './components/Feed'
import OrbitLock from './games/OrbitLock'
import LaneShift from './games/LaneShift'
import EchoGrid from './games/EchoGrid'
import GravityFlip from './games/GravityFlip'
import MicroMayhem from './games/MicroMayhem'
import CannonDash from './games/CannonDash'
import RailBlaster from './games/RailBlaster'
import TurboServe from './games/TurboServe'
import ReelTrouble from './games/ReelTrouble'
import PinDrop from './games/PinDrop'

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
  {
    slug: 'micro-mayhem',
    title: 'Micro Mayhem',
    instruction: 'Obey the command before the fuse pops.',
    accentColor: '#ffea3d',
    component: MicroMayhem,
  },
  {
    slug: 'cannon-dash',
    title: 'Cannon Dash',
    instruction: 'Tap when the cannon lines up. One miss ends it.',
    accentColor: '#a98aff',
    component: CannonDash,
  },
  {
    slug: 'rail-blaster',
    title: 'Rail Blaster',
    instruction: 'Blast orange bots. Never shoot green stars.',
    accentColor: '#ff5b35',
    component: RailBlaster,
  },
  {
    slug: 'turbo-serve',
    title: 'Turbo Serve',
    instruction: 'Tap in the green return zone. Every rally accelerates.',
    accentColor: '#ff5b35',
    component: TurboServe,
  },
  {
    slug: 'reel-trouble',
    title: 'Reel Trouble',
    instruction: 'Hold to reel. Release before the line snaps.',
    accentColor: '#78d8ff',
    component: ReelTrouble,
  },
  {
    slug: 'pin-drop',
    title: 'Pin Drop',
    instruction: 'Tap to lock direction, then tap again for power.',
    accentColor: '#a98aff',
    component: PinDrop,
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
