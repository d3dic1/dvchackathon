import { useEffect, useRef, useCallback } from 'react'
import { GameProps } from '../types/game'
import { hapticLight, hapticError } from '../utils/haptics'
import { playSound } from '../utils/audio'

interface Barrier { y: number; lane: 0 | 1; passed: boolean }

const ORANGE = '#ff5b35'
const BLUE = '#2a78d1'
const CREAM = '#fffdf7'
const LIME = '#8cff69'
const INK = '#29445e'

export default function LaneShift({ isActive, onScore, onGameOver, reducedMotion, soundEnabled }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({
    lane: 0 as 0 | 1,
    visualLane: 0,
    barriers: [] as Barrier[],
    score: 0,
    speed: 290,
    spawnTimer: 0,
    spawnInterval: 1.08,
    running: false,
    rafId: 0,
    lastTime: 0,
    distance: 0,
    flash: 0,
  })

  const roadEdges = (width: number, height: number, y: number) => {
    const horizon = height * .2
    const progress = Math.max(0, Math.min(1, (y - horizon) / (height - horizon)))
    const roadWidth = width * (.18 + progress * .72)
    return { left: width / 2 - roadWidth / 2, width: roadWidth, progress }
  }

  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const state = stateRef.current
    const sky = ctx.createLinearGradient(0, 0, 0, height)
    sky.addColorStop(0, '#76cdfc')
    sky.addColorStop(.52, '#e6f7ff')
    sky.addColorStop(.53, '#f5fbff')
    sky.addColorStop(1, '#c8e9f6')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, width, height)

    ctx.fillStyle = '#b5d8eb'
    ctx.beginPath()
    ctx.moveTo(0, height * .3)
    ctx.lineTo(width * .2, height * .08)
    ctx.lineTo(width * .38, height * .3)
    ctx.lineTo(width * .65, height * .03)
    ctx.lineTo(width, height * .31)
    ctx.closePath()
    ctx.fill()

    const horizon = height * .2
    ctx.fillStyle = CREAM
    ctx.beginPath()
    ctx.moveTo(width * .41, horizon)
    ctx.lineTo(width * .05, height)
    ctx.lineTo(width * .95, height)
    ctx.lineTo(width * .59, horizon)
    ctx.closePath()
    ctx.fill()

    ctx.strokeStyle = BLUE
    ctx.lineWidth = 5
    ctx.setLineDash([26, 22])
    ctx.beginPath()
    ctx.moveTo(width / 2, horizon)
    ctx.lineTo(width / 2, height)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.strokeStyle = ORANGE
    ctx.lineWidth = 8
    ctx.beginPath()
    ctx.moveTo(width * .41, horizon)
    ctx.lineTo(width * .05, height)
    ctx.moveTo(width * .59, horizon)
    ctx.lineTo(width * .95, height)
    ctx.stroke()

    for (const barrier of state.barriers) {
      const road = roadEdges(width, height, barrier.y)
      const laneWidth = road.width / 2
      const x = road.left + barrier.lane * laneWidth + laneWidth * .12
      const w = laneWidth * .76
      const h = 22 + road.progress * 46
      ctx.fillStyle = barrier.lane === 0 ? ORANGE : BLUE
      ctx.strokeStyle = INK
      ctx.lineWidth = 4
      ctx.fillRect(x, barrier.y - h, w, h)
      ctx.strokeRect(x, barrier.y - h, w, h)
      ctx.strokeStyle = CREAM
      ctx.lineWidth = 5
      for (let stripe = x + 8; stripe < x + w; stripe += 24) {
        ctx.beginPath()
        ctx.moveTo(stripe, barrier.y - h)
        ctx.lineTo(stripe + 15, barrier.y)
        ctx.stroke()
      }
    }

    state.visualLane += (state.lane - state.visualLane) * .22
    const playerY = height * .77
    const road = roadEdges(width, height, playerY)
    const laneWidth = road.width / 2
    const playerX = road.left + (state.visualLane + .5) * laneWidth

    ctx.save()
    ctx.translate(playerX, playerY)
    ctx.fillStyle = LIME
    ctx.strokeStyle = CREAM
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(0, -28)
    ctx.lineTo(21, 24)
    ctx.lineTo(0, 13)
    ctx.lineTo(-21, 24)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.restore()

    ctx.fillStyle = INK
    ctx.font = `900 ${Math.max(15, height * .02)}px "Archivo Black", sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText(`SLOPE ${Math.round(state.speed)}`, width / 2, horizon - 20)

    if (state.flash > 0) {
      ctx.globalAlpha = state.flash * .55
      ctx.fillStyle = CREAM
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
    const width = canvas.width
    const height = canvas.height
    const dt = state.lastTime ? Math.min((time - state.lastTime) / 1000, .05) : .016
    state.lastTime = time
    const speed = state.speed * (reducedMotion ? .72 : 1)

    state.barriers.forEach(barrier => {
      barrier.y += speed * dt
      if (!barrier.passed && barrier.y > height * .82) {
        barrier.passed = true
        state.score += 10
        onScore(state.score)
      }
    })
    state.barriers = state.barriers.filter(barrier => barrier.y < height + 100)

    state.spawnTimer += dt
    if (state.spawnTimer >= state.spawnInterval) {
      state.spawnTimer = 0
      state.barriers.push({ y: height * .18, lane: Math.random() > .5 ? 1 : 0, passed: false })
      state.spawnInterval = Math.max(.52, 1.08 - state.score * .007)
    }

    state.distance += speed * dt
    state.speed = Math.min(620, 290 + state.score * 2.8 + state.distance / 95)
    state.flash = Math.max(0, state.flash - dt * 5)

    const hit = state.barriers.some(barrier => {
      if (barrier.lane !== state.lane) return false
      return barrier.y > height * .71 && barrier.y < height * .83
    })
    if (hit) {
      state.running = false
      state.flash = 1
      hapticError()
      playSound('fail', soundEnabled)
      draw(context, width, height)
      onGameOver(state.score)
      return
    }

    draw(context, width, height)
    state.rafId = requestAnimationFrame(loop)
  }, [draw, onGameOver, onScore, reducedMotion, soundEnabled])

  const tap = useCallback(() => {
    const state = stateRef.current
    if (!state.running) return
    state.lane = state.lane === 0 ? 1 : 0
    hapticLight()
    playSound('tap', soundEnabled)
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
        lane: 0, visualLane: 0, barriers: [], score: 0, speed: 290, spawnTimer: 0,
        spawnInterval: 1.08, running: true, lastTime: 0, distance: 0, flash: 0,
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
      aria-label="Slalom Panic. Tap to carve between lanes and avoid gates."
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
