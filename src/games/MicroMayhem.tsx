import { useCallback, useEffect, useRef, useState } from 'react'
import { GameProps } from '../types/game'
import { hapticError, hapticLight } from '../utils/haptics'
import { playSound } from '../utils/audio'

type Command = 'TAP' | 'DOUBLE' | 'HOLD' | 'WAIT'
type Phase = 'ready' | 'success' | 'fail'

const COMMAND_COPY: Record<Command, { title: string; sub: string; icon: string }> = {
  TAP: { title: 'TAP!', sub: 'ONE CLEAN HIT', icon: '!' },
  DOUBLE: { title: 'DOUBLE!', sub: 'TWO QUICK HITS', icon: '2×' },
  HOLD: { title: 'HOLD!', sub: 'PRESS, THEN RELEASE', icon: '●' },
  WAIT: { title: 'DON’T TAP!', sub: 'LET THE FUSE BURN', icon: '✦' },
}

export default function MicroMayhem({ isActive, onScore, onGameOver, reducedMotion, soundEnabled }: GameProps) {
  const runRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const nextTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const pointerRef = useRef({ id: -1, x: 0, y: 0, time: 0, moved: false })
  const commandRef = useRef<Command>('TAP')
  const tapsRef = useRef(0)
  const scoreRef = useRef(0)
  const roundRef = useRef(0)
  const acceptingRef = useRef(false)
  const [command, setCommand] = useState<Command>('TAP')
  const [phase, setPhase] = useState<Phase>('ready')
  const [score, setScore] = useState(0)
  const [round, setRound] = useState(1)
  const [roundTime, setRoundTime] = useState(1700)

  const fail = useCallback(() => {
    if (!acceptingRef.current) return
    acceptingRef.current = false
    clearTimeout(timerRef.current)
    clearTimeout(nextTimerRef.current)
    setPhase('fail')
    hapticError()
    playSound('fail', soundEnabled)
    onGameOver(scoreRef.current)
  }, [onGameOver, soundEnabled])

  const beginRound = useCallback((runId: number) => {
    if (runId !== runRef.current) return
    roundRef.current += 1
    const options: Command[] = roundRef.current < 2
      ? ['TAP']
      : roundRef.current < 4
        ? ['TAP', 'DOUBLE', 'HOLD']
        : ['TAP', 'DOUBLE', 'HOLD', 'WAIT']
    let next = options[Math.floor(Math.random() * options.length)]
    if (next === commandRef.current && options.length > 1) {
      next = options[(options.indexOf(next) + 1) % options.length]
    }
    const duration = Math.max(780, 1750 - roundRef.current * 65)
    commandRef.current = next
    tapsRef.current = 0
    acceptingRef.current = true
    setCommand(next)
    setRound(roundRef.current)
    setRoundTime(reducedMotion ? duration * 1.2 : duration)
    setPhase('ready')

    timerRef.current = setTimeout(() => {
      if (runId !== runRef.current || !acceptingRef.current) return
      if (commandRef.current === 'WAIT') {
        acceptingRef.current = false
        scoreRef.current += 25 * roundRef.current
        setScore(scoreRef.current)
        onScore(scoreRef.current)
        hapticLight()
        playSound('success', soundEnabled)
        setPhase('success')
        nextTimerRef.current = setTimeout(() => beginRound(runId), reducedMotion ? 90 : 210)
      } else {
        fail()
      }
    }, reducedMotion ? duration * 1.2 : duration)
  }, [fail, onScore, reducedMotion, soundEnabled])

  const succeed = useCallback(() => {
    if (!acceptingRef.current) return
    acceptingRef.current = false
    clearTimeout(timerRef.current)
    scoreRef.current += 25 * roundRef.current
    setScore(scoreRef.current)
    onScore(scoreRef.current)
    hapticLight()
    playSound('success', soundEnabled)
    setPhase('success')
    const runId = runRef.current
    nextTimerRef.current = setTimeout(() => beginRound(runId), reducedMotion ? 90 : 210)
  }, [beginRound, onScore, reducedMotion, soundEnabled])

  const handleGesture = useCallback((heldFor: number) => {
    if (!acceptingRef.current) return
    const current = commandRef.current
    if (current === 'WAIT') {
      fail()
      return
    }
    if (current === 'HOLD') {
      if (heldFor >= 480) succeed()
      else fail()
      return
    }
    if (heldFor > 420) {
      fail()
      return
    }
    tapsRef.current += 1
    if (current === 'TAP') succeed()
    else if (current === 'DOUBLE' && tapsRef.current >= 2) succeed()
    else {
      hapticLight()
      playSound('tap', soundEnabled)
    }
  }, [fail, soundEnabled, succeed])

  useEffect(() => {
    runRef.current += 1
    const runId = runRef.current
    clearTimeout(timerRef.current)
    clearTimeout(nextTimerRef.current)
    acceptingRef.current = false
    if (isActive) {
      scoreRef.current = 0
      roundRef.current = 0
      setScore(0)
      beginRound(runId)
    }
    return () => {
      runRef.current += 1
      acceptingRef.current = false
      clearTimeout(timerRef.current)
      clearTimeout(nextTimerRef.current)
    }
  }, [beginRound, isActive])

  const copy = COMMAND_COPY[command]

  return (
    <div
      className={`micro-game is-${phase}`}
      role="button"
      tabIndex={0}
      aria-label="Micro Mayhem. Obey each tap, double tap, hold, or wait command before the fuse expires."
      onPointerDown={event => {
        pointerRef.current = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          time: performance.now(),
          moved: false,
        }
      }}
      onPointerMove={event => {
        const pointer = pointerRef.current
        if (pointer.id === event.pointerId && Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 12) {
          pointer.moved = true
        }
      }}
      onPointerUp={event => {
        const pointer = pointerRef.current
        if (pointer.id === event.pointerId && !pointer.moved) handleGesture(performance.now() - pointer.time)
        pointer.id = -1
      }}
      onPointerCancel={() => { pointerRef.current.id = -1 }}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          handleGesture(commandRef.current === 'HOLD' ? 500 : 100)
        }
      }}
    >
      <div className="micro-game__rays" aria-hidden="true" />
      <div className="micro-game__round">MICRO {String(round).padStart(2, '0')}</div>
      <div className="micro-game__screen">
        <span>{phase === 'success' ? 'NICE!' : phase === 'fail' ? 'TOO SLOW!' : copy.title}</span>
        <strong>{copy.icon}</strong>
        <small>{phase === 'ready' ? copy.sub : phase === 'success' ? `+${25 * round}` : 'RUN OVER'}</small>
      </div>
      <div className="micro-game__fuse" key={`${round}-${roundTime}`}>
        <i style={{ '--round-time': `${roundTime}ms` } as React.CSSProperties} />
      </div>
      <div className="micro-game__score">CHAOS SCORE {score}</div>
    </div>
  )
}
