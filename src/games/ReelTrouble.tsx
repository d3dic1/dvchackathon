import { useCallback, useEffect, useRef } from 'react'
import { GameProps } from '../types/game'
import { hapticError, hapticLight, hapticMedium } from '../utils/haptics'
import { playSound } from '../utils/audio'

const INK = '#29445e'
const CREAM = '#fffdf7'
const ORANGE = '#ff5b35'
const LIME = '#8cff69'
const BLUE = '#2a78d1'

export default function ReelTrouble({ isActive, onScore, onGameOver, reducedMotion, soundEnabled }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointerRef = useRef({ id: -1, x: 0, y: 0, moved: false })
  const stateRef = useRef({
    distance: .82,
    tension: .18,
    reeling: false,
    round: 1,
    score: 0,
    running: false,
    rafId: 0,
    lastTime: 0,
    elapsed: 0,
    pause: 0,
    flash: 0,
    message: 'HOLD TO REEL',
  })

  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const state = stateRef.current
    const waterline = height * .44
    const fishX = width * (.23 + state.distance * .58)
    const fishY = height * .66 + Math.sin(state.elapsed * 3.2) * height * .045
    const rodX = width * .18
    const rodY = height * .34

    const sky = ctx.createLinearGradient(0, 0, 0, height)
    sky.addColorStop(0, '#ffcd68')
    sky.addColorStop(.43, '#fff0bb')
    sky.addColorStop(.44, '#65bdf1')
    sky.addColorStop(1, '#164b9a')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, width, height)

    ctx.fillStyle = 'rgba(255,255,255,.26)'
    for (let y = waterline + 20; y < height; y += 40) {
      ctx.fillRect((y * 1.7 + state.elapsed * 20) % 90 - 30, y, width * .42, 4)
      ctx.fillRect((y * .9 - state.elapsed * 14) % 110 + width * .45, y + 13, width * .34, 4)
    }

    ctx.fillStyle = ORANGE
    ctx.strokeStyle = INK
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(width * .04, waterline - 14)
    ctx.lineTo(width * .38, waterline - 14)
    ctx.lineTo(width * .31, waterline + 34)
    ctx.lineTo(width * .08, waterline + 34)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.strokeStyle = INK
    ctx.lineWidth = 8
    ctx.beginPath()
    ctx.moveTo(width * .17, waterline - 16)
    ctx.lineTo(rodX, rodY)
    ctx.lineTo(width * .67, height * .49)
    ctx.stroke()

    ctx.strokeStyle = state.tension > .78 ? ORANGE : CREAM
    ctx.lineWidth = 3 + state.tension * 3
    ctx.beginPath()
    ctx.moveTo(width * .67, height * .49)
    ctx.quadraticCurveTo(width * .73, height * (.53 + state.tension * .08), fishX, fishY)
    ctx.stroke()

    ctx.save()
    ctx.translate(fishX, fishY)
    ctx.scale(-1, 1)
    ctx.fillStyle = LIME
    ctx.strokeStyle = INK
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.ellipse(0, 0, 38, 23, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(32, 0)
    ctx.lineTo(58, -22)
    ctx.lineTo(58, 22)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = INK
    ctx.beginPath()
    ctx.arc(-17, -6, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    ctx.fillStyle = CREAM
    ctx.strokeStyle = INK
    ctx.lineWidth = 4
    ctx.fillRect(width * .12, height * .2, width * .76, 34)
    ctx.strokeRect(width * .12, height * .2, width * .76, 34)
    const safeWidth = width * .76 * Math.min(1, state.tension)
    ctx.fillStyle = state.tension > .78 ? ORANGE : state.tension > .55 ? '#ffd83d' : LIME
    ctx.fillRect(width * .12, height * .2, safeWidth, 34)

    ctx.fillStyle = INK
    ctx.textAlign = 'center'
    ctx.font = `900 ${Math.max(21, height * .034)}px "Archivo Black", sans-serif`
    ctx.fillText(state.message, width / 2, height * .31)
    ctx.font = `500 ${Math.max(10, height * .014)}px "DM Mono", monospace`
    ctx.fillText(
      state.reeling ? `REELING - LINE ${Math.round(state.tension * 100)}%` : `RELEASE - LINE ${Math.round(state.tension * 100)}%`,
      width / 2,
      height * .345,
    )
    ctx.fillStyle = CREAM
    ctx.fillText(`FISH ${state.round} - ${Math.round((1 - state.distance) * 100)}% LANDED`, width / 2, height * .82)

    if (state.flash > 0) {
      ctx.globalAlpha = state.flash * .42
      ctx.fillStyle = state.message === 'LINE SNAPPED!' || state.message === 'FISH ESCAPED!' ? ORANGE : LIME
      ctx.fillRect(0, 0, width, height)
      ctx.globalAlpha = 1
    }
  }, [])

  const endRun = useCallback((message: string) => {
    const state = stateRef.current
    if (!state.running) return
    state.running = false
    state.reeling = false
    state.message = message
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
    state.elapsed += dt
    state.flash = Math.max(0, state.flash - dt * 5)

    if (state.pause > 0) {
      state.pause -= dt
      if (state.pause <= 0) {
        state.distance = Math.min(.96, .8 + state.round * .015)
        state.tension = .16
        state.message = 'HOLD TO REEL'
      }
      draw(context, canvas.width, canvas.height)
      state.rafId = requestAnimationFrame(loop)
      return
    }

    const motionScale = reducedMotion ? .82 : 1
    const fishPull = .42 + Math.sin(state.elapsed * (2.2 + state.round * .12)) * .2
    if (state.reeling) {
      state.distance -= dt * Math.max(.1, .23 - state.round * .006) * motionScale
      state.tension += dt * (.34 + fishPull * .46 + state.round * .018) * motionScale
      state.message = state.tension > .76 ? 'EASE OFF!' : 'KEEP REELING!'
    } else {
      state.distance += dt * (.075 + state.round * .007) * motionScale
      state.tension -= dt * .55
      state.message = state.tension < .28 ? 'HOLD TO REEL' : 'COOL THE LINE'
    }
    state.tension = Math.max(0, state.tension)

    if (state.tension >= 1) {
      draw(context, canvas.width, canvas.height)
      endRun('LINE SNAPPED!')
      return
    }
    if (state.distance >= 1.12) {
      draw(context, canvas.width, canvas.height)
      endRun('FISH ESCAPED!')
      return
    }
    if (state.distance <= 0) {
      state.score += 100 * state.round
      state.round += 1
      state.reeling = false
      state.pause = reducedMotion ? .22 : .52
      state.message = 'LANDED!'
      state.flash = 1
      onScore(state.score)
      hapticMedium()
      playSound('success', soundEnabled)
    }

    draw(context, canvas.width, canvas.height)
    state.rafId = requestAnimationFrame(loop)
  }, [draw, endRun, onScore, reducedMotion, soundEnabled])

  const setReeling = useCallback((reeling: boolean) => {
    const state = stateRef.current
    if (!state.running || state.pause > 0) return
    state.reeling = reeling
    if (reeling) {
      hapticLight()
      playSound('tap', soundEnabled)
    }
  }, [soundEnabled])

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
        distance: .82, tension: .18, reeling: false, round: 1, score: 0,
        running: true, lastTime: 0, elapsed: 0, pause: 0, flash: 0,
        message: 'HOLD TO REEL',
      })
      state.rafId = requestAnimationFrame(loop)
    } else {
      state.running = false
      state.reeling = false
      cancelAnimationFrame(state.rafId)
    }
    return () => {
      state.running = false
      state.reeling = false
      cancelAnimationFrame(state.rafId)
    }
  }, [isActive, loop])

  return (
    <canvas
      ref={canvasRef}
      className="game-canvas"
      role="button"
      tabIndex={0}
      aria-label="Reel Trouble. Hold to reel the fish in and release before the line tension snaps."
      onPointerDown={event => {
        pointerRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false }
        setReeling(true)
      }}
      onPointerMove={event => {
        const pointer = pointerRef.current
        if (pointer.id === event.pointerId && Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 12) {
          pointer.moved = true
          setReeling(false)
        }
      }}
      onPointerUp={event => {
        if (pointerRef.current.id === event.pointerId) setReeling(false)
        pointerRef.current.id = -1
      }}
      onPointerCancel={() => {
        pointerRef.current.id = -1
        setReeling(false)
      }}
      onKeyDown={event => {
        if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) {
          event.preventDefault()
          setReeling(true)
        }
      }}
      onKeyUp={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          setReeling(false)
        }
      }}
    />
  )
}
