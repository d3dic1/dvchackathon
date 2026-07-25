import { useCallback, useEffect, useRef } from 'react'
import { GameProps } from '../types/game'
import { useTapGesture } from '../hooks/useTapGesture'
import { hapticError, hapticLight } from '../utils/haptics'
import { playSound } from '../utils/audio'

const TAU = Math.PI * 2
const INK = '#29445e'
const CREAM = '#fffdf7'
const ORANGE = '#ff5b35'
const LIME = '#8cff69'
const BLUE = '#2a78d1'

export default function CannonDash({ isActive, onScore, onGameOver, reducedMotion, soundEnabled }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({
    angle: -Math.PI / 2,
    speed: 1.7,
    targetAngle: -Math.PI / 2,
    targetDistance: .3,
    targetRadius: .115,
    score: 0,
    streak: 0,
    running: false,
    rafId: 0,
    lastTime: 0,
    flash: 0,
    message: 'FIRE!',
  })

  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const state = stateRef.current
    const cx = width / 2
    const cy = height * .58
    const maxDistance = Math.min(width * .43, height * .31)
    const targetDistance = maxDistance * (.82 + state.targetDistance)
    const tx = cx + Math.cos(state.targetAngle) * targetDistance
    const ty = cy + Math.sin(state.targetAngle) * targetDistance
    const targetRadius = Math.max(22, width * state.targetRadius)

    const sky = ctx.createLinearGradient(0, 0, 0, height)
    sky.addColorStop(0, '#7d5ed7')
    sky.addColorStop(.48, '#b99cf6')
    sky.addColorStop(.49, '#f5c85a')
    sky.addColorStop(1, '#e78a37')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, width, height)

    ctx.fillStyle = 'rgba(255,253,247,.22)'
    for (let y = height * .12; y < height; y += 58) {
      for (let x = (y / 58) % 2 ? 18 : -10; x < width; x += 58) {
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, TAU)
        ctx.fill()
      }
    }

    ctx.strokeStyle = 'rgba(41,68,94,.24)'
    ctx.lineWidth = 5
    ctx.setLineDash([12, 14])
    ctx.beginPath()
    ctx.arc(cx, cy, maxDistance * 1.5, 0, TAU)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.save()
    ctx.translate(tx, ty)
    ctx.rotate(state.targetAngle + Math.PI / 2)
    ctx.fillStyle = LIME
    ctx.strokeStyle = INK
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.arc(0, 0, targetRadius, 0, TAU)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = INK
    ctx.beginPath()
    ctx.arc(0, 0, targetRadius * .5, 0, TAU)
    ctx.fill()
    ctx.fillStyle = CREAM
    ctx.beginPath()
    ctx.arc(0, 0, targetRadius * .22, 0, TAU)
    ctx.fill()
    ctx.restore()

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(state.angle)
    ctx.fillStyle = ORANGE
    ctx.strokeStyle = INK
    ctx.lineWidth = 6
    ctx.fillRect(0, -18, maxDistance * .58, 36)
    ctx.strokeRect(0, -18, maxDistance * .58, 36)
    ctx.restore()

    ctx.fillStyle = BLUE
    ctx.strokeStyle = CREAM
    ctx.lineWidth = 7
    ctx.beginPath()
    ctx.arc(cx, cy, Math.min(width * .12, 52), 0, TAU)
    ctx.fill()
    ctx.stroke()
    ctx.strokeStyle = INK
    ctx.lineWidth = 5
    ctx.stroke()

    ctx.fillStyle = CREAM
    ctx.textAlign = 'center'
    ctx.font = `900 ${Math.max(25, height * .04)}px "Archivo Black", sans-serif`
    ctx.fillText(state.message, cx, height * .28)
    ctx.font = `500 ${Math.max(10, height * .014)}px "DM Mono", monospace`
    ctx.fillText(state.streak > 1 ? `${state.streak} BARREL STREAK` : 'LINE UP THE CORE', cx, height * .315)

    if (state.flash > 0) {
      ctx.globalAlpha = state.flash * .38
      ctx.fillStyle = state.message === 'MISFIRE!' ? ORANGE : LIME
      ctx.fillRect(0, 0, width, height)
      ctx.globalAlpha = 1
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
    state.angle = (state.angle + state.speed * dt * (reducedMotion ? .72 : 1)) % TAU
    state.targetAngle += Math.sin(time / 780) * .0018
    state.flash = Math.max(0, state.flash - dt * 4.5)
    draw(context, canvas.width, canvas.height)
    state.rafId = requestAnimationFrame(loop)
  }, [draw, reducedMotion])

  const fire = useCallback(() => {
    const state = stateRef.current
    if (!state.running) return
    const rawDistance = Math.abs(state.angle - state.targetAngle)
    const angleDistance = Math.min(rawDistance, TAU - rawDistance)
    const tolerance = Math.max(.075, state.targetRadius * .75)

    if (angleDistance <= tolerance) {
      const precision = 1 - angleDistance / tolerance
      state.streak += 1
      state.score += (precision > .72 ? 20 : 10) * state.streak
      state.speed = Math.min(7.8, 1.7 + state.streak * .31)
      state.targetRadius = Math.max(.052, .115 - state.streak * .006)
      state.targetDistance = .12 + Math.random() * .28
      state.targetAngle = -Math.PI + .35 + Math.random() * (Math.PI - .7)
      state.message = precision > .72 ? 'CORE HIT!' : 'LOCKED!'
      state.flash = 1
      onScore(state.score)
      hapticLight()
      playSound('success', soundEnabled)
    } else {
      state.running = false
      state.message = 'MISFIRE!'
      state.flash = 1
      hapticError()
      playSound('fail', soundEnabled)
      onGameOver(state.score)
    }
  }, [onGameOver, onScore, soundEnabled])
  const tapGesture = useTapGesture<HTMLCanvasElement>(fire)

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
        angle: -Math.PI / 2, speed: 1.7, targetAngle: -Math.PI / 2,
        targetDistance: .3, targetRadius: .115, score: 0, streak: 0,
        running: true, lastTime: 0, flash: 0, message: 'FIRE!',
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
      aria-label="Cannon Dash. Tap when the rotating cannon points at the target barrel."
      {...tapGesture}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          fire()
        }
      }}
    />
  )
}
