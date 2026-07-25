import { useEffect, useRef, useCallback } from 'react'
import { GameProps } from '../types/game'
import { hapticLight, hapticError } from '../utils/haptics'

interface Barrier {
  x: number
  lane: number // 0 = left, 1 = right
  w: number
  h: number
}

export default function LaneShift({ isActive, onScore, onGameOver, reducedMotion }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({
    lane: 0,
    barriers: [] as Barrier[],
    score: 0,
    speed: 220,
    spawnTimer: 0,
    spawnInterval: 1.4,
    running: false,
    rafId: 0,
    lastTime: 0,
    playerX: 0,
    playerY: 0,
    flash: 0,
    dist: 0,
  })

  const PLAYER_SIZE = 22
  const LANE_COUNT = 2

  const draw = useCallback((ctx: CanvasRenderingContext2D, W: number, H: number) => {
    const s = stateRef.current
    const laneW = W / LANE_COUNT
    const playerX = laneW * s.lane + laneW / 2
    s.playerX = playerX
    s.playerY = H * 0.75

    ctx.fillStyle = '#0a0a0f'
    ctx.fillRect(0, 0, W, H)

    // lane divider
    ctx.save()
    ctx.strokeStyle = '#1c1c2a'
    ctx.lineWidth = 2
    ctx.setLineDash([24, 18])
    ctx.beginPath()
    ctx.moveTo(W / 2, 0)
    ctx.lineTo(W / 2, H)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()

    // lane glows
    for (let i = 0; i < LANE_COUNT; i++) {
      const lx = laneW * i
      const grad = ctx.createLinearGradient(lx, 0, lx + laneW, 0)
      grad.addColorStop(0, i === 0 ? '#9b5de510' : '#00e5ff10')
      grad.addColorStop(1, i === 0 ? '#9b5de508' : '#00e5ff08')
      ctx.fillStyle = grad
      ctx.fillRect(lx, 0, laneW, H)
    }

    // barriers
    for (const b of s.barriers) {
      const bx = laneW * b.lane
      ctx.save()
      ctx.shadowBlur = 20
      ctx.shadowColor = '#ff006e'
      const grad = ctx.createLinearGradient(bx, b.x, bx + laneW, b.x + b.h)
      grad.addColorStop(0, '#ff006e')
      grad.addColorStop(1, '#9b5de5')
      ctx.fillStyle = grad
      ctx.fillRect(bx + 8, b.x, laneW - 16, b.h)
      ctx.restore()
    }

    // player
    ctx.save()
    ctx.shadowBlur = 30
    ctx.shadowColor = '#c8ff00'
    ctx.fillStyle = '#c8ff00'
    const px = playerX
    const py = s.playerY
    ctx.beginPath()
    ctx.moveTo(px, py - PLAYER_SIZE)
    ctx.lineTo(px + PLAYER_SIZE * 0.7, py + PLAYER_SIZE * 0.6)
    ctx.lineTo(px, py + PLAYER_SIZE * 0.2)
    ctx.lineTo(px - PLAYER_SIZE * 0.7, py + PLAYER_SIZE * 0.6)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    // speed trail
    ctx.save()
    ctx.globalAlpha = 0.3
    for (let i = 1; i <= 3; i++) {
      ctx.shadowBlur = 10
      ctx.shadowColor = '#c8ff00'
      ctx.fillStyle = '#c8ff00'
      ctx.beginPath()
      ctx.moveTo(px, py - PLAYER_SIZE + i * 12)
      ctx.lineTo(px + (PLAYER_SIZE * 0.7) * (1 - i * 0.2), py + PLAYER_SIZE * 0.6 + i * 6)
      ctx.lineTo(px, py + PLAYER_SIZE * 0.2 + i * 6)
      ctx.lineTo(px - (PLAYER_SIZE * 0.7) * (1 - i * 0.2), py + PLAYER_SIZE * 0.6 + i * 6)
      ctx.closePath()
      ctx.globalAlpha = 0.15 - i * 0.04
      ctx.fill()
    }
    ctx.restore()

    if (s.flash > 0) {
      ctx.save()
      ctx.globalAlpha = s.flash * 0.4
      ctx.fillStyle = '#ff006e'
      ctx.fillRect(0, 0, W, H)
      ctx.restore()
    }

    // score
    ctx.save()
    ctx.font = `700 ${Math.round(H * 0.045)}px Orbitron, monospace`
    ctx.fillStyle = '#f0f0f5'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.shadowBlur = 16
    ctx.shadowColor = '#c8ff00'
    ctx.fillText(String(s.score), W / 2, H * 0.12)
    ctx.restore()
  }, [])

  const checkCollision = useCallback((W: number, H: number): boolean => {
    const s = stateRef.current
    const laneW = W / LANE_COUNT
    for (const b of s.barriers) {
      if (b.lane !== s.lane) continue
      const bTop = b.x, bBot = b.x + b.h
      const pTop = s.playerY - PLAYER_SIZE, pBot = s.playerY + PLAYER_SIZE * 0.6
      if (bBot > pTop && bTop < pBot) return true
    }
    return false
  }, [])

  const loop = useCallback((ts: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const s = stateRef.current
    if (!s.running) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height

    if (W < 100 || H < 200) {
      s.rafId = requestAnimationFrame(loop)
      return
    }

    const dt = s.lastTime ? Math.min((ts - s.lastTime) / 1000, 0.05) : 0.016
    s.lastTime = ts

    const speedMult = reducedMotion ? 0.6 : 1
    const spd = s.speed * speedMult

    // move barriers down (toward player)
    for (const b of s.barriers) {
      b.x += spd * dt
    }
    s.barriers = s.barriers.filter(b => b.x < H + 100)

    // spawn
    s.spawnTimer += dt
    if (s.spawnTimer >= s.spawnInterval) {
      s.spawnTimer = 0
      const blockedLane = Math.random() < 0.5 ? 0 : 1
      for (let l = 0; l < LANE_COUNT; l++) {
        if (l === blockedLane) {
          s.barriers.push({ x: -80, lane: l, w: W / LANE_COUNT - 16, h: 38 })
        }
      }
    }

    s.dist += spd * dt
    s.score = Math.floor(s.dist / 60)
    s.speed = 220 + s.score * 2.5

    if (s.flash > 0) s.flash -= dt * 4

    if (checkCollision(W, H)) {
      s.flash = 1
      hapticError()
      s.running = false
      cancelAnimationFrame(s.rafId)
      draw(ctx, W, H)
      onGameOver(s.score)
      return
    }

    onScore(s.score)
    draw(ctx, W, H)
    s.rafId = requestAnimationFrame(loop)
  }, [draw, checkCollision, onScore, onGameOver, reducedMotion])

  const tap = useCallback(() => {
    const s = stateRef.current
    if (!s.running) return
    s.lane = s.lane === 0 ? 1 : 0
    hapticLight()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const s = stateRef.current
    if (isActive) {
      s.lane = 0
      s.barriers = []
      s.score = 0
      s.speed = 220
      s.spawnTimer = 0
      s.spawnInterval = 1.4
      s.lastTime = 0
      s.flash = 0
      s.dist = 0
      s.running = true
      s.rafId = requestAnimationFrame(loop)
    } else {
      s.running = false
      cancelAnimationFrame(s.rafId)
    }
    return () => {
      s.running = false
      cancelAnimationFrame(s.rafId)
    }
  }, [isActive, loop])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
      onClick={tap}
      onTouchEnd={e => { e.preventDefault(); tap() }}
    />
  )
}
