import { useEffect, useRef, useCallback, useState } from 'react'
import { GameProps } from '../types/game'
import { hapticLight, hapticError } from '../utils/haptics'
import { playSound } from '../utils/audio'

const PAD_COLORS = ['#f04a24', '#123fc5', '#d7ff2f', '#121212']
const PAD_LABELS = ['A', 'B', 'C', 'D']
type Phase = 'showing' | 'input' | 'correct' | 'fail'

export default function EchoGrid({ isActive, onScore, onGameOver, reducedMotion, soundEnabled }: GameProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const runRef = useRef(0)
  const sequenceRef = useRef<number[]>([])
  const inputRef = useRef<number[]>([])
  const scoreRef = useRef(0)
  const phaseRef = useRef<Phase>('showing')
  const [lit, setLit] = useState(-1)
  const [phase, setPhase] = useState<Phase>('showing')
  const [score, setScore] = useState(0)
  const [inputCount, setInputCount] = useState(0)

  const wait = useCallback((callback: () => void, delay: number) => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(callback, delay)
  }, [])

  const showSequence = useCallback((runId: number) => {
    let index = 0
    const pace = Math.max(220, 520 - sequenceRef.current.length * 22)
    phaseRef.current = 'showing'
    setPhase('showing')
    setInputCount(0)

    const next = () => {
      if (runId !== runRef.current) return
      if (index >= sequenceRef.current.length) {
        setLit(-1)
        wait(() => {
          if (runId !== runRef.current) return
          phaseRef.current = 'input'
          setPhase('input')
        }, reducedMotion ? 100 : 280)
        return
      }
      setLit(sequenceRef.current[index])
      wait(() => {
        setLit(-1)
        index += 1
        wait(next, reducedMotion ? 80 : 140)
      }, reducedMotion ? 180 : pace)
    }
    wait(next, 280)
  }, [reducedMotion, wait])

  const addRound = useCallback((runId: number) => {
    sequenceRef.current.push(Math.floor(Math.random() * 4))
    inputRef.current = []
    showSequence(runId)
  }, [showSequence])

  const handlePad = useCallback((index: number) => {
    if (phaseRef.current !== 'input') return
    hapticLight()
    playSound('tap', soundEnabled)
    setLit(index)
    wait(() => setLit(-1), 110)
    inputRef.current.push(index)
    setInputCount(inputRef.current.length)
    const position = inputRef.current.length - 1

    if (inputRef.current[position] !== sequenceRef.current[position]) {
      phaseRef.current = 'fail'
      setPhase('fail')
      hapticError()
      playSound('fail', soundEnabled)
      onGameOver(scoreRef.current)
      return
    }

    if (inputRef.current.length === sequenceRef.current.length) {
      const roundPoints = sequenceRef.current.length * 10
      scoreRef.current += roundPoints
      setScore(scoreRef.current)
      onScore(scoreRef.current)
      playSound('success', soundEnabled)
      phaseRef.current = 'correct'
      setPhase('correct')
      const runId = runRef.current
      wait(() => addRound(runId), reducedMotion ? 180 : 520)
    }
  }, [addRound, onGameOver, onScore, soundEnabled, wait])

  useEffect(() => {
    runRef.current += 1
    clearTimeout(timerRef.current)
    if (isActive) {
      sequenceRef.current = []
      inputRef.current = []
      scoreRef.current = 0
      setScore(0)
      setInputCount(0)
      addRound(runRef.current)
    }
    return () => {
      runRef.current += 1
      clearTimeout(timerRef.current)
    }
  }, [addRound, isActive])

  return (
    <div className="echo-game">
      <div className="echo-game__burst" aria-hidden="true" />
      <div className="echo-game__header">
        <span>ROUND {String(sequenceRef.current.length).padStart(2, '0')}</span>
        <strong>{score}</strong>
      </div>
      <div className="echo-game__grid">
        {PAD_COLORS.map((color, index) => {
          const active = lit === index
          return (
            <button
              key={color}
              className={active ? 'is-lit' : ''}
              onPointerUp={() => handlePad(index)}
              style={{ '--pad': color } as React.CSSProperties}
              aria-label={`Echo pad ${PAD_LABELS[index]}`}
            >
              <span>{PAD_LABELS[index]}</span>
            </button>
          )
        })}
      </div>
      <div className={`echo-game__status is-${phase}`}>
        {phase === 'showing' && 'WATCH THE SIGNAL'}
        {phase === 'input' && `YOUR TURN · ${inputCount}/${sequenceRef.current.length}`}
        {phase === 'correct' && 'SEQUENCE LOCKED!'}
        {phase === 'fail' && 'SIGNAL LOST'}
      </div>
    </div>
  )
}
