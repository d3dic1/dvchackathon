import { useCallback, useEffect, useRef } from 'react'
import { GameProps } from '../types/game'
import { useTapGesture } from '../hooks/useTapGesture'
import { hapticError, hapticLight } from '../utils/haptics'
import { playSound } from '../utils/audio'

const INK = '#29445e'
const CREAM = '#fffdf7'
const ORANGE = '#ff5b35'
const LIME = '#8cff69'
const BLUE = '#2a78d1'

export default function TurboServe({ isActive, onScore, onGameOver, reducedMotion, soundEnabled }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({
    ballProgress: .18,
    towardPlayer: true,
    lane: 0,
    targetLane: 0,
    speed: .46,
    score: 0,
    rally: 0,
    running: false,
    rafId: 0,
    lastTime: 0,
    flash: 0,
    message: 'RETURN!',
  })

  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const state = stateRef.current
    const top = height * .23
    const bottom = height * .83
    const depth = state.ballProgress
    const ballY = top + (bottom - top) * depth
    const laneWidth = width * (.12 + depth * .3)
    const ballX = width / 2 + state.lane * laneWidth
    const ballRadius = 8 + depth * 9

    const sky = ctx.createLinearGradient(0, 0, 0, height)
    sky.addColorStop(0, '#ff9b52')
    sky.addColorStop(.45, '#ffd26b')
    sky.addColorStop(.46, '#2a78d1')
    sky.addColorStop(1, '#123b8d')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, width, height)

    ctx.fillStyle = 'rgba(255,253,247,.28)'
    for (let x = -30; x < width + 40; x += 68) {
      ctx.beginPath()
      ctx.arc(x, height * .17, 34, Math.PI, 0)
      ctx.fill()
    }

    ctx.fillStyle = CREAM
    ctx.strokeStyle = INK
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(width * .39, top)
    ctx.lineTo(width * .06, height)
    ctx.lineTo(width * .94, height)
    ctx.lineTo(width * .61, top)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.strokeStyle = BLUE
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(width / 2, top)
    ctx.lineTo(width / 2, height)
    ctx.moveTo(width * .235, height * .62)
    ctx.lineTo(width * .765, height * .62)
    ctx.stroke()

    ctx.fillStyle = INK
    ctx.fillRect(width * .14, height * .48, width * .72, 8)
    ctx.strokeStyle = CREAM
    ctx.lineWidth = 3
    ctx.beginPath()
    for (let x = width * .14; x <= width * .86; x += 12) {
      ctx.moveTo(x, height * .48)
      ctx.lineTo(x, height * .535)
    }
    ctx.stroke()

    const hitWindow = Math.max(.045, .09 - state.rally * .003)
    const zoneTop = top + (bottom - top) * (.78 - hitWindow)
    const zoneBottom = top + (bottom - top) * (.78 + hitWindow)
    ctx.fillStyle = 'rgba(140,255,105,.5)'
    ctx.fillRect(width * .08, zoneTop, width * .84, zoneBottom - zoneTop)
    ctx.strokeStyle = LIME
    ctx.lineWidth = 4
    ctx.strokeRect(width * .08, zoneTop, width * .84, zoneBottom - zoneTop)

    ctx.save()
    ctx.translate(width / 2 + state.targetLane * width * .32, height * .865)
    ctx.rotate(state.targetLane * .12)
    ctx.fillStyle = ORANGE
    ctx.strokeStyle = INK
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.ellipse(0, 0, 50, 17, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.restore()

    ctx.fillStyle = CREAM
    ctx.strokeStyle = INK
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = INK
    ctx.textAlign = 'center'
    ctx.font = `900 ${Math.max(22, height * .037)}px "Archivo Black", sans-serif`
    ctx.fillText(state.message, width / 2, height * .34)
    ctx.font = `500 ${Math.max(10, height * .014)}px "DM Mono", monospace`
    ctx.fillText(state.rally ? `${state.rally} SHOT RALLY` : 'TAP INSIDE THE GREEN', width / 2, height * .375)

    if (state.flash > 0) {
      ctx.globalAlpha = state.flash * .38
      ctx.fillStyle = state.message === 'OUT!' ? ORANGE : LIME
      ctx.fillRect(0, 0, width, height)
      ctx.globalAlpha = 1
    }
  }, [])

  const endRun = useCallback(() => {
    const state = stateRef.current
    if (!state.running) return
    state.running = false
    state.message = 'OUT!'
    state.flash = 1
    hapticError()
    playSound('fail', soundEnabled)
    onGameOver(state.score)
  }, [onGameOver, soundEnabled])

  const loop = useCallback((time: number) => {
    const canvas = canvasRef.current
    const state = stateRef.current
    if (!canvas || !state.running) return
    const context = canvas.getContext('2d')
    if (!context) return
    const dt = state.lastTime ? Math.min((time - state.lastTime) / 1000, .05) : .016
    state.lastTime = time
    const pace = reducedMotion ? .78 : 1
    state.ballProgress += (state.towardPlayer ? 1 : -1) * state.speed * dt * pace
    state.lane += (state.targetLane - state.lane) * Math.min(1, dt * 3.7)
    state.flash = Math.max(0, state.flash - dt * 5)

    if (!state.towardPlayer && state.ballProgress <= .12) {
      state.ballProgress = .12
      state.towardPlayer = true
      state.targetLane = -.82 + Math.random() * 1.64
      state.message = 'RETURN!'
    } else if (state.towardPlayer && state.ballProgress > .91) {
      draw(context, canvas.width, canvas.height)
      endRun()
      return
    }

    draw(context, canvas.width, canvas.height)
    state.rafId = requestAnimationFrame(loop)
  }, [draw, endRun, reducedMotion])

  const returnBall = useCallback(() => {
    const state = stateRef.current
    if (!state.running || !state.towardPlayer) return
    const hitWindow = Math.max(.045, .09 - state.rally * .003)
    const distance = Math.abs(state.ballProgress - .78)
    if (distance > hitWindow) {
      endRun()
      return
    }
    const precision = 1 - distance / hitWindow
    state.rally += 1
    state.score += (precision > .72 ? 25 : 15) * Math.min(10, state.rally)
    state.speed = Math.min(1.36, .46 + state.rally * .045)
    state.towardPlayer = false
    state.targetLane = -.65 + Math.random() * 1.3
    state.message = precision > .72 ? 'SMASH!' : 'NICE!'
    state.flash = 1
    onScore(state.score)
    hapticLight()
    playSound('success', soundEnabled)
  }, [endRun, onScore, soundEnabled])
  const tapGesture = useTapGesture<HTMLCanvasElement>(returnBall)

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
        ballProgress: .18, towardPlayer: true, lane: 0, targetLane: 0,
        speed: .46, score: 0, rally: 0, running: true, lastTime: 0,
        flash: 0, message: 'RETURN!',
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
      aria-label="Turbo Serve. Tap when the ball enters the green return zone."
      {...tapGesture}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          returnBall()
        }
      }}
    />
  )
}
