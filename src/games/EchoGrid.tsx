import { useEffect, useRef, useCallback, useState } from 'react'
import { GameProps } from '../types/game'
import { hapticLight, hapticError } from '../utils/haptics'

const PAD_COLORS = ['#c8ff00', '#00e5ff', '#ff006e', '#9b5de5']
const PAD_GLOW = ['#c8ff0080', '#00e5ff80', '#ff006e80', '#9b5de580']

type Phase = 'showing' | 'input' | 'correct' | 'fail'

export default function EchoGrid({ isActive, onScore, onGameOver }: GameProps) {
  const stateRef = useRef({
    sequence: [] as number[],
    playerSeq: [] as number[],
    phase: 'showing' as Phase,
    showIdx: 0,
    score: 0,
    lit: -1,
    timerId: undefined as ReturnType<typeof setTimeout> | undefined,
  })

  const [lit, setLit] = useState(-1)
  const [phase, setPhase] = useState<Phase>('showing')
  const [score, setScore] = useState(0)
  const [inputLit, setInputLit] = useState(-1)

  const addStep = useCallback(() => {
    const s = stateRef.current
    s.sequence.push(Math.floor(Math.random() * 4))
    s.playerSeq = []
    s.showIdx = 0
    s.phase = 'showing'
    setPhase('showing')
    setLit(-1)
    const showNext = (idx: number) => {
      if (idx >= s.sequence.length) {
        clearTimeout(s.timerId)
        s.timerId = setTimeout(() => {
          s.phase = 'input'
          setPhase('input')
          setLit(-1)
        }, 400)
        return
      }
      clearTimeout(s.timerId)
      s.timerId = setTimeout(() => {
        setLit(s.sequence[idx])
        s.timerId = setTimeout(() => {
          setLit(-1)
          s.timerId = setTimeout(() => showNext(idx + 1), 200)
        }, 500)
      }, 300)
    }
    showNext(0)
  }, [])

  const startGame = useCallback(() => {
    const s = stateRef.current
    s.sequence = []
    s.playerSeq = []
    s.score = 0
    setScore(0)
    addStep()
  }, [addStep])

  const handlePad = useCallback((idx: number) => {
    const s = stateRef.current
    if (s.phase !== 'input') return
    hapticLight()
    setInputLit(idx)
    setTimeout(() => setInputLit(-1), 150)

    s.playerSeq.push(idx)
    const pos = s.playerSeq.length - 1

    if (s.playerSeq[pos] !== s.sequence[pos]) {
      hapticError()
      s.phase = 'fail'
      setPhase('fail')
      clearTimeout(s.timerId)
      onGameOver(s.score)
      return
    }

    if (s.playerSeq.length === s.sequence.length) {
      s.score++
      setScore(s.score)
      onScore(s.score)
      s.phase = 'correct'
      setPhase('correct')
      clearTimeout(s.timerId)
      s.timerId = setTimeout(() => addStep(), 600)
    }
  }, [addStep, onScore, onGameOver])

  useEffect(() => {
    if (isActive) {
      startGame()
    } else {
      const s = stateRef.current
      clearTimeout(s.timerId)
      s.phase = 'showing'
    }
    return () => {
      const s = stateRef.current
      clearTimeout(s.timerId)
    }
  }, [isActive, startGame])

  const padSize = 'min(38vw, 38vh)'

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#0a0a0f',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 0,
      touchAction: 'none',
    }}>
      {/* Score */}
      <div style={{
        fontFamily: 'Orbitron, monospace',
        fontSize: 'clamp(28px, 8vw, 52px)',
        fontWeight: 700,
        color: '#f0f0f5',
        marginBottom: '5vh',
        textShadow: '0 0 20px #c8ff00',
      }}>
        {score}
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        padding: '8px',
      }}>
        {[0, 1, 2, 3].map(i => {
          const isLit = lit === i || inputLit === i
          return (
            <button
              key={i}
              onPointerDown={e => { e.preventDefault(); handlePad(i) }}
              style={{
                width: padSize,
                height: padSize,
                maxWidth: '160px',
                maxHeight: '160px',
                background: isLit ? PAD_COLORS[i] : '#111118',
                border: `3px solid ${PAD_COLORS[i]}`,
                borderRadius: '20px',
                cursor: 'pointer',
                boxShadow: isLit
                  ? `0 0 40px ${PAD_GLOW[i]}, inset 0 0 20px ${PAD_GLOW[i]}`
                  : `0 0 12px ${PAD_GLOW[i]}44`,
                transition: 'all 0.08s ease',
                transform: isLit ? 'scale(0.95)' : 'scale(1)',
                touchAction: 'none',
              }}
            />
          )
        })}
      </div>

      <div style={{
        marginTop: '5vh',
        fontFamily: 'Inter, sans-serif',
        fontSize: 'clamp(12px, 3.5vw, 16px)',
        color: phase === 'showing' ? '#c8ff00' : phase === 'correct' ? '#00e5ff' : '#6b6b7a',
        fontWeight: 500,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        textShadow: phase === 'showing' ? '0 0 12px #c8ff00' : 'none',
        transition: 'color 0.2s',
      }}>
        {phase === 'showing' ? 'Watch...' : phase === 'input' ? 'Your turn' : phase === 'correct' ? '✓ Nice!' : ''}
      </div>

      {/* Sequence length indicator */}
      <div style={{
        marginTop: '16px',
        display: 'flex',
        gap: '6px',
      }}>
        {stateRef.current.sequence.map((_, i) => (
          <div key={i} style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: i < stateRef.current.playerSeq.length ? '#c8ff00' : '#2a2a3a',
            boxShadow: i < stateRef.current.playerSeq.length ? '0 0 6px #c8ff00' : 'none',
            transition: 'all 0.15s',
          }} />
        ))}
      </div>
    </div>
  )
}
