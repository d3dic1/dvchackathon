import { useEffect, useRef, useCallback } from 'react'
import { GameProps } from '../types/game'
import { hapticLight, hapticError } from '../utils/haptics'
import { playSound } from '../utils/audio'

const TAU = Math.PI * 2
const BLUE = '#2a78d1'
const CREAM = '#fffdf7'
const ORANGE = '#ff5b35'
const LIME = '#8dd95d'
const INK = '#28405c'

export default function OrbitLock({ isActive, onScore, onGameOver, reducedMotion, soundEnabled }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({
    angle: 0,
    targetCenter: Math.PI,
    targetSize: .5,
    speed: 1.8,
    score: 0,
    combo: 0,
    running: false,
    rafId: 0,
    drift: 0,
    lastTime: 0,
    flash: 0,
    judgement: 'TAP!',
  })

  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const state = stateRef.current
    const cx = width / 2
    const cy = height * .48
    const radius = Math.min(width * .34, height * .22)

    const sky = ctx.createLinearGradient(0, 0, 0, height)
    sky.addColorStop(0, '#71c9ff')
    sky.addColorStop(.57, '#e8f8ff')
    sky.addColorStop(.58, '#7bd45b')
    sky.addColorStop(1, '#3f9c45')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, width, height)

    ctx.fillStyle = 'rgba(255,255,255,.88)'
    for (let x = -50; x < width + 80; x += 170) {
      ctx.beginPath()
      ctx.arc(x, height * .25, 52, Math.PI, 0)
      ctx.arc(x + 48, height * .25, 68, Math.PI, 0)
      ctx.fill()
    }
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.ellipse(width * .5, height * .74, width * .42, height * .12, 0, 0, TAU)
    ctx.fill()

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(-.035)
    ctx.fillStyle = CREAM
    ctx.strokeStyle = INK
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.arc(0, 0, radius + 44, 0, TAU)
    ctx.fill()
    ctx.stroke()
    ctx.restore()

    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, TAU)
    ctx.strokeStyle = INK
    ctx.lineWidth = 18
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, TAU)
    ctx.strokeStyle = BLUE
    ctx.lineWidth = 10
    ctx.setLineDash([7, 12])
    ctx.stroke()
    ctx.setLineDash([])

    ctx.beginPath()
    ctx.arc(cx, cy, radius, state.targetCenter - state.targetSize / 2, state.targetCenter + state.targetSize / 2)
    ctx.strokeStyle = ORANGE
    ctx.lineWidth = 25
    ctx.stroke()

    const markerX = cx + Math.cos(state.angle) * radius
    const markerY = cy + Math.sin(state.angle) * radius
    ctx.fillStyle = state.flash > 0 ? ORANGE : CREAM
    ctx.strokeStyle = INK
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.arc(markerX, markerY, 13, 0, TAU)
    ctx.fill()
    ctx.stroke()

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = INK
    ctx.font = `900 ${Math.max(24, height * .04)}px "Archivo Black", sans-serif`
    ctx.fillText(state.judgement, cx, cy - 5)
    ctx.font = `500 ${Math.max(11, height * .016)}px "DM Mono", monospace`
    ctx.fillText(state.combo > 1 ? `${state.combo} SWING STREAK` : 'HIT THE RED', cx, cy + 30)

    if (state.flash > 0) {
      ctx.save()
      ctx.globalAlpha = state.flash * .32
      ctx.fillStyle = state.judgement === 'MISS!' ? '#ff3655' : '#ffe85c'
      ctx.fillRect(0, 0, width, height)
      ctx.restore()
    }
  }, [])

  const loop = useCallback((time: number) => {
    const canvas = canvasRef.current
    const state = stateRef.current
    if (!canvas || !state.running) return
    const context = canvas.getContext('2d')
    if (!context) return

    const dt = state.lastTime ? Math.min((time - state.lastTime) / 1000, .05) : .016
    state.lastTime = time
    state.angle = (state.angle + state.speed * (reducedMotion ? .7 : 1) * dt) % TAU
    state.drift += .13 * dt
    state.targetCenter = (Math.PI + Math.sin(state.drift) * 2.2 + TAU) % TAU
    state.flash = Math.max(0, state.flash - dt * 3.2)

    draw(context, canvas.width, canvas.height)
    state.rafId = requestAnimationFrame(loop)
  }, [draw, reducedMotion])

  const tap = useCallback(() => {
    const state = stateRef.current
    if (!state.running) return
    const rawDistance = Math.abs(state.angle - state.targetCenter)
    const distance = Math.min(rawDistance, TAU - rawDistance)

    if (distance <= state.targetSize / 2) {
      const accuracy = 1 - distance / (state.targetSize / 2)
      const points = accuracy > .72 ? 5 : accuracy > .35 ? 3 : 1
      state.combo += 1
      state.score += points * Math.max(1, state.combo)
      state.speed = Math.min(1.8 + state.combo * .19, 7.4)
      state.targetSize = Math.max(.18, .5 - state.combo * .02)
      state.judgement = points === 5 ? 'PERFECT!' : points === 3 ? 'NICE!' : 'SAFE!'
      state.flash = 1
      hapticLight()
      playSound('success', soundEnabled)
      onScore(state.score)
    } else {
      state.judgement = 'MISS!'
      state.flash = 1
      state.running = false
      hapticError()
      playSound('fail', soundEnabled)
      onGameOver(state.score)
    }
  }, [onGameOver, onScore, soundEnabled])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(canvas.offsetWidth * ratio)
      canvas.height = Math.round(canvas.offsetHeight * ratio)
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const state = stateRef.current
    if (isActive) {
      Object.assign(state, {
        angle: 0, targetCenter: Math.PI, targetSize: .5, speed: 1.8, score: 0,
        combo: 0, running: true, drift: 0, lastTime: 0, flash: 0, judgement: 'SWING!',
      })
      state.rafId = requestAnimationFrame(loop)
    } else {
      state.running = false
      cancelAnimationFrame(state.rafId)
    }
    return () => {
      state.running = false
      cancelAnimationFrame(state.rafId)
    }
  }, [isActive, loop])

  return (
    <canvas
      ref={canvasRef}
      className="game-canvas"
      role="button"
      tabIndex={0}
      aria-label="Power Swing. Tap when the marker reaches the red sweet spot."
      onPointerUp={tap}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          tap()
        }
      }}
    />
  )
}
