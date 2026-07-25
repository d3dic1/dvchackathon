import { useEffect, useRef, useCallback } from 'react'
import { GameProps } from '../types/game'
import { hapticLight, hapticError } from '../utils/haptics'
import { playSound } from '../utils/audio'

interface Obstacle { x: number; side: 'floor' | 'ceiling'; passed: boolean }

const BLUE = '#123fc5'
const CREAM = '#f5e7c6'
const ORANGE = '#f04a24'
const LIME = '#d7ff2f'
const INK = '#121212'

export default function GravityFlip({ isActive, onScore, onGameOver, reducedMotion, soundEnabled }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({
    onFloor: true,
    playerY: -1,
    obstacles: [] as Obstacle[],
    score: 0,
    speed: 230,
    spawnTimer: 0,
    spawnInterval: 1.35,
    running: false,
    rafId: 0,
    lastTime: 0,
    flash: 0,
  })

  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const state = stateRef.current
    const top = height * .18
    const bottom = height * .82
    const playerX = width * .24

    ctx.fillStyle = BLUE
    ctx.fillRect(0, 0, width, height)

    ctx.fillStyle = CREAM
    ctx.fillRect(0, 0, width, top)
    ctx.fillRect(0, bottom, width, height - bottom)

    ctx.strokeStyle = INK
    ctx.lineWidth = 7
    ctx.beginPath()
    ctx.moveTo(0, top)
    ctx.lineTo(width, top)
    ctx.moveTo(0, bottom)
    ctx.lineTo(width, bottom)
    ctx.stroke()

    ctx.fillStyle = ORANGE
    for (let x = -30; x < width + 30; x += 48) {
      ctx.beginPath()
      ctx.moveTo(x, top)
      ctx.lineTo(x + 18, top - 24)
      ctx.lineTo(x + 36, top)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(x, bottom)
      ctx.lineTo(x + 18, bottom + 24)
      ctx.lineTo(x + 36, bottom)
      ctx.fill()
    }

    for (const obstacle of state.obstacles) {
      const obstacleHeight = (bottom - top) * .42
      const y = obstacle.side === 'floor' ? bottom - obstacleHeight : top
      ctx.fillStyle = ORANGE
      ctx.strokeStyle = INK
      ctx.lineWidth = 5
      ctx.fillRect(obstacle.x - 24, y, 48, obstacleHeight)
      ctx.strokeRect(obstacle.x - 24, y, 48, obstacleHeight)
      ctx.fillStyle = LIME
      for (let stripe = y + 10; stripe < y + obstacleHeight; stripe += 25) {
        ctx.fillRect(obstacle.x - 18, stripe, 36, 8)
      }
    }

    ctx.save()
    ctx.translate(playerX, state.playerY)
    if (!state.onFloor) ctx.scale(1, -1)
    ctx.fillStyle = LIME
    ctx.strokeStyle = INK
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.roundRect(-22, -33, 44, 38, 12)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = INK
    ctx.fillRect(-11, -20, 7, 7)
    ctx.fillRect(5, -20, 7, 7)
    ctx.beginPath()
    ctx.moveTo(-15, 7)
    ctx.lineTo(-24, 20)
    ctx.moveTo(15, 7)
    ctx.lineTo(24, 20)
    ctx.stroke()
    ctx.restore()

    ctx.fillStyle = CREAM
    ctx.textAlign = 'center'
    ctx.font = `500 ${Math.max(12, height * .017)}px "DM Mono", monospace`
    ctx.fillText(state.onFloor ? 'GRAVITY: DOWN ↓' : 'GRAVITY: UP ↑', width / 2, height / 2)

    if (state.flash > 0) {
      ctx.globalAlpha = state.flash * .5
      ctx.fillStyle = ORANGE
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
    const top = height * .18
    const bottom = height * .82
    const dt = state.lastTime ? Math.min((time - state.lastTime) / 1000, .05) : .016
    state.lastTime = time
    const speed = state.speed * (reducedMotion ? .74 : 1)

    const targetY = state.onFloor ? bottom - 14 : top + 14
    if (state.playerY < 0) state.playerY = targetY
    state.playerY += (targetY - state.playerY) * Math.min(1, dt * (reducedMotion ? 28 : 16))

    state.obstacles.forEach(obstacle => {
      obstacle.x -= speed * dt
      if (!obstacle.passed && obstacle.x < width * .16) {
        obstacle.passed = true
        state.score += 10
        onScore(state.score)
      }
    })
    state.obstacles = state.obstacles.filter(obstacle => obstacle.x > -70)

    state.spawnTimer += dt
    if (state.spawnTimer >= state.spawnInterval) {
      state.spawnTimer = 0
      const lastSide = state.obstacles.at(-1)?.side
      const side = Math.random() < .62 && lastSide ? lastSide : (Math.random() > .5 ? 'floor' : 'ceiling')
      state.obstacles.push({ x: width + 40, side, passed: false })
      state.spawnInterval = Math.max(.72, 1.35 - state.score * .004)
    }
    state.speed = Math.min(500, 230 + state.score * 1.9)
    state.flash = Math.max(0, state.flash - dt * 5)

    const collision = state.obstacles.some(obstacle => {
      if (Math.abs(obstacle.x - width * .24) > 42) return false
      return (state.onFloor && obstacle.side === 'floor') || (!state.onFloor && obstacle.side === 'ceiling')
    })
    if (collision) {
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
    if (!stateRef.current.running) return
    stateRef.current.onFloor = !stateRef.current.onFloor
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
        onFloor: true, playerY: -1, obstacles: [], score: 0, speed: 230, spawnTimer: 0,
        spawnInterval: 1.35, running: true, lastTime: 0, flash: 0,
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
      aria-label="Gravity Flip. Tap to flip between the floor and ceiling."
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
