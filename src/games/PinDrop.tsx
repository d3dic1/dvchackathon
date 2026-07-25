import { useCallback, useEffect, useRef } from 'react'
import { GameProps } from '../types/game'
import { useTapGesture } from '../hooks/useTapGesture'
import { hapticError, hapticLight, hapticMedium } from '../utils/haptics'
import { playSound } from '../utils/audio'

type Phase = 'aim' | 'power' | 'rolling'

const INK = '#29445e'
const CREAM = '#fffdf7'
const ORANGE = '#ff5b35'
const LIME = '#8cff69'
const BLUE = '#2a78d1'

function drawPin(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scale, scale)
  ctx.fillStyle = CREAM
  ctx.strokeStyle = INK
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(-7, 25)
  ctx.quadraticCurveTo(-14, 8, -6, -4)
  ctx.quadraticCurveTo(-3, -10, -4, -21)
  ctx.quadraticCurveTo(0, -30, 4, -21)
  ctx.quadraticCurveTo(3, -10, 6, -4)
  ctx.quadraticCurveTo(14, 8, 7, 25)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = ORANGE
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(-5, -7)
  ctx.lineTo(5, -7)
  ctx.stroke()
  ctx.restore()
}

export default function PinDrop({ isActive, onScore, onGameOver, reducedMotion, soundEnabled }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({
    phase: 'aim' as Phase,
    aim: 0,
    lockedAim: 0,
    aimDirection: 1,
    power: .2,
    powerDirection: 1,
    targetAim: 0,
    targetPower: .72,
    roll: 0,
    settle: 0,
    pendingPins: 0,
    pendingPoints: 0,
    gutter: false,
    frame: 1,
    score: 0,
    running: false,
    rafId: 0,
    lastTime: 0,
    flash: 0,
    message: 'LOCK AIM',
  })

  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const state = stateRef.current
    const top = height * .24
    const bottom = height * .92
    const laneLeftTop = width * .36
    const laneRightTop = width * .64

    const background = ctx.createLinearGradient(0, 0, 0, height)
    background.addColorStop(0, '#a98aff')
    background.addColorStop(.42, '#e6d7ff')
    background.addColorStop(.43, '#d9a34b')
    background.addColorStop(1, '#8f542d')
    ctx.fillStyle = background
    ctx.fillRect(0, 0, width, height)

    ctx.fillStyle = CREAM
    ctx.strokeStyle = INK
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(laneLeftTop, top)
    ctx.lineTo(width * .06, bottom)
    ctx.lineTo(width * .94, bottom)
    ctx.lineTo(laneRightTop, top)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.strokeStyle = 'rgba(41,68,94,.22)'
    ctx.lineWidth = 3
    for (let index = 1; index < 5; index++) {
      const ratio = index / 5
      const y = top + (bottom - top) * ratio
      const left = laneLeftTop + (width * .06 - laneLeftTop) * ratio
      const right = laneRightTop + (width * .94 - laneRightTop) * ratio
      ctx.beginPath()
      ctx.moveTo(left, y)
      ctx.lineTo(right, y)
      ctx.stroke()
    }

    const pinRows = [
      [0],
      [-.055, .055],
      [-.11, 0, .11],
      [-.165, -.055, .055, .165],
    ]
    pinRows.forEach((row, rowIndex) => {
      row.forEach(offset => {
        drawPin(ctx, width * (.5 + offset), top + 30 + rowIndex * 18, .48 + rowIndex * .05)
      })
    })

    const aimTolerance = Math.max(.11, .28 - state.frame * .012)
    const aimBarX = width * .14
    const aimBarY = height * .16
    const aimBarW = width * .72
    ctx.fillStyle = CREAM
    ctx.strokeStyle = INK
    ctx.lineWidth = 4
    ctx.fillRect(aimBarX, aimBarY, aimBarW, 24)
    ctx.strokeRect(aimBarX, aimBarY, aimBarW, 24)
    ctx.fillStyle = LIME
    ctx.fillRect(
      aimBarX + (state.targetAim + 1 - aimTolerance) / 2 * aimBarW,
      aimBarY,
      aimTolerance * aimBarW,
      24,
    )
    const activeAim = state.phase === 'aim' ? state.aim : state.lockedAim
    ctx.fillStyle = ORANGE
    ctx.fillRect(aimBarX + (activeAim + 1) / 2 * aimBarW - 4, aimBarY - 7, 8, 38)

    const powerX = width * .12
    const powerY = height * .55
    const powerH = height * .27
    ctx.fillStyle = CREAM
    ctx.strokeStyle = INK
    ctx.lineWidth = 4
    ctx.fillRect(powerX, powerY, 28, powerH)
    ctx.strokeRect(powerX, powerY, 28, powerH)
    ctx.fillStyle = LIME
    ctx.fillRect(powerX, powerY + (1 - state.targetPower - .09) * powerH, 28, powerH * .18)
    ctx.fillStyle = ORANGE
    ctx.fillRect(powerX, powerY + (1 - state.power) * powerH - 4, 28, 8)

    const ballStartX = width / 2
    const ballStartY = height * .84
    const ballEndX = width / 2 + state.lockedAim * width * .24
    const ballEndY = top + 48
    const rollEase = 1 - Math.pow(1 - state.roll, 2)
    const ballX = state.phase === 'rolling' ? ballStartX + (ballEndX - ballStartX) * rollEase : ballStartX
    const ballY = state.phase === 'rolling' ? ballStartY + (ballEndY - ballStartY) * rollEase : ballStartY
    const ballRadius = state.phase === 'rolling' ? 23 - state.roll * 13 : 23
    ctx.fillStyle = BLUE
    ctx.strokeStyle = INK
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = INK
    ctx.beginPath()
    ctx.arc(ballX - ballRadius * .25, ballY - ballRadius * .25, Math.max(2, ballRadius * .12), 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = INK
    ctx.textAlign = 'center'
    ctx.font = `900 ${Math.max(22, height * .036)}px "Archivo Black", sans-serif`
    ctx.fillText(state.message, width / 2, height * .36)
    ctx.font = `500 ${Math.max(10, height * .014)}px "DM Mono", monospace`
    ctx.fillText(`FRAME ${state.frame} - ${state.phase === 'aim' ? 'TAP DIRECTION' : state.phase === 'power' ? 'TAP POWER' : 'WATCH IT ROLL'}`, width / 2, height * .395)

    if (state.flash > 0) {
      ctx.globalAlpha = state.flash * .4
      ctx.fillStyle = state.gutter ? ORANGE : LIME
      ctx.fillRect(0, 0, width, height)
      ctx.globalAlpha = 1
    }
  }, [])

  const endRun = useCallback(() => {
    const state = stateRef.current
    if (!state.running) return
    state.running = false
    state.message = 'GUTTER!'
    state.flash = 1
    hapticError()
    playSound('fail', soundEnabled)
    onGameOver(state.score)
  }, [onGameOver, soundEnabled])

  const resetFrame = useCallback(() => {
    const state = stateRef.current
    state.phase = 'aim'
    state.aim = 0
    state.lockedAim = 0
    state.aimDirection = Math.random() > .5 ? 1 : -1
    state.power = .18
    state.powerDirection = 1
    state.targetAim = -.65 + Math.random() * 1.3
    state.targetPower = .58 + Math.random() * .3
    state.roll = 0
    state.settle = 0
    state.pendingPins = 0
    state.pendingPoints = 0
    state.gutter = false
    state.message = 'LOCK AIM'
  }, [])

  const loop = useCallback((time: number) => {
    const canvas = canvasRef.current
    const state = stateRef.current
    if (!canvas || !state.running) return
    const context = canvas.getContext('2d')
    if (!context) return
    const dt = state.lastTime ? Math.min((time - state.lastTime) / 1000, .05) : .016
    state.lastTime = time
    const pace = reducedMotion ? .78 : 1
    state.flash = Math.max(0, state.flash - dt * 5)

    if (state.phase === 'aim') {
      state.aim += state.aimDirection * dt * (.92 + state.frame * .055) * pace
      if (Math.abs(state.aim) >= 1) {
        state.aim = Math.sign(state.aim)
        state.aimDirection *= -1
      }
    } else if (state.phase === 'power') {
      state.power += state.powerDirection * dt * (.78 + state.frame * .045) * pace
      if (state.power >= 1 || state.power <= 0) {
        state.power = Math.max(0, Math.min(1, state.power))
        state.powerDirection *= -1
      }
    } else if (state.settle > 0) {
      state.settle -= dt
      if (state.settle <= 0) {
        state.frame += 1
        resetFrame()
      }
    } else {
      state.roll = Math.min(1, state.roll + dt * (reducedMotion ? 1.8 : 1.35))
      if (state.roll >= 1) {
        if (state.gutter) {
          draw(context, canvas.width, canvas.height)
          endRun()
          return
        }
        state.score += state.pendingPoints
        state.message = state.pendingPins === 10 ? 'STRIKE!' : `${state.pendingPins} PINS!`
        state.flash = 1
        onScore(state.score)
        hapticMedium()
        playSound('success', soundEnabled)
        state.settle = reducedMotion ? .18 : .52
      }
    }

    draw(context, canvas.width, canvas.height)
    state.rafId = requestAnimationFrame(loop)
  }, [draw, endRun, onScore, reducedMotion, resetFrame, soundEnabled])

  const bowl = useCallback(() => {
    const state = stateRef.current
    if (!state.running || state.phase === 'rolling') return
    if (state.phase === 'aim') {
      state.lockedAim = state.aim
      state.phase = 'power'
      state.message = 'LOCK POWER'
      hapticLight()
      playSound('tap', soundEnabled)
      return
    }

    const aimTolerance = Math.max(.11, .28 - state.frame * .012)
    const aimError = Math.abs(state.lockedAim - state.targetAim)
    const powerError = Math.abs(state.power - state.targetPower)
    const aimQuality = Math.max(0, 1 - aimError / aimTolerance)
    const powerQuality = Math.max(0, 1 - powerError / .23)
    const quality = aimQuality * .62 + powerQuality * .38
    state.gutter = aimError > aimTolerance * 1.7 || powerError > .38
    state.pendingPins = state.gutter ? 0 : Math.max(4, Math.min(10, Math.round(4 + quality * 6)))
    state.pendingPoints = state.pendingPins * 10 * state.frame + (state.pendingPins === 10 ? 50 * state.frame : 0)
    state.phase = 'rolling'
    state.roll = 0
    state.message = state.gutter ? 'OH NO...' : 'ROLLING!'
    hapticLight()
    playSound('tap', soundEnabled)
  }, [soundEnabled])
  const tapGesture = useTapGesture<HTMLCanvasElement>(bowl)

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
        phase: 'aim', aim: 0, lockedAim: 0, aimDirection: 1, power: .2,
        powerDirection: 1, targetAim: 0, targetPower: .72, roll: 0, settle: 0,
        pendingPins: 0, pendingPoints: 0, gutter: false, frame: 1, score: 0,
        running: true, lastTime: 0, flash: 0, message: 'LOCK AIM',
      })
      resetFrame()
      state.rafId = requestAnimationFrame(loop)
    } else {
      state.running = false
      cancelAnimationFrame(state.rafId)
    }
    return () => {
      state.running = false
      cancelAnimationFrame(state.rafId)
    }
  }, [isActive, loop, resetFrame])

  return (
    <canvas
      ref={canvasRef}
      className="game-canvas"
      role="button"
      tabIndex={0}
      aria-label="Pin Drop. Tap once to lock your direction and again to lock bowling power."
      {...tapGesture}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          bowl()
        }
      }}
    />
  )
}
