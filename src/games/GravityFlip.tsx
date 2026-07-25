import { useEffect, useRef, useCallback } from 'react'
import { GameProps } from '../types/game'
import { hapticLight, hapticError } from '../utils/haptics'

interface Obstacle {
  x: number
  gapY: number   // center of gap
  gapH: number
}

export default function GravityFlip({ isActive, onScore, onGameOver, reducedMotion }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({
    playerY: -1, // -1 = uninitialized; set on first valid frame
    onFloor: true,
    score: 0,
    speed: 180,
    obstacles: [] as Obstacle[],
    spawnTimer: 0,
    spawnInterval: 1.5,
    running: false,
    rafId: 0,
    lastTime: 0,
    flash: 0,
    dist: 0,
    tunnelH: 0,
  })

  const PLAYER_SIZE = 18
  const TUNNEL_MARGIN = 0.12

  const draw = useCallback((ctx: CanvasRenderingContext2D, W: number, H: number) => {
    const s = stateRef.current
    const tunnelTop = H * TUNNEL_MARGIN
    const tunnelBot = H * (1 - TUNNEL_MARGIN)
    s.tunnelH = tunnelBot - tunnelTop

    ctx.fillStyle = '#0a0a0f'
    ctx.fillRect(0, 0, W, H)

    // tunnel walls
    const topGrad = ctx.createLinearGradient(0, 0, 0, tunnelTop)
    topGrad.addColorStop(0, '#00e5ff')
    topGrad.addColorStop(1, '#00e5ff22')
    ctx.fillStyle = topGrad
    ctx.fillRect(0, 0, W, tunnelTop)

    const botGrad = ctx.createLinearGradient(0, tunnelBot, 0, H)
    botGrad.addColorStop(0, '#00e5ff22')
    botGrad.addColorStop(1, '#00e5ff')
    ctx.fillStyle = botGrad
    ctx.fillRect(0, tunnelBot, W, H - tunnelBot)

    // wall glow lines
    ctx.save()
    ctx.shadowBlur = 20
    ctx.shadowColor = '#00e5ff'
    ctx.strokeStyle = '#00e5ff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, tunnelTop)
    ctx.lineTo(W, tunnelTop)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, tunnelBot)
    ctx.lineTo(W, tunnelBot)
    ctx.stroke()
    ctx.restore()

    // obstacles
    for (const ob of s.obstacles) {
      const gapTop = ob.gapY - ob.gapH / 2
      const gapBot = ob.gapY + ob.gapH / 2

      ctx.save()
      ctx.shadowBlur = 16
      ctx.shadowColor = '#ff006e'
      ctx.fillStyle = '#ff006e'
      // top block
      ctx.fillRect(ob.x - 18, tunnelTop, 36, gapTop - tunnelTop)
      // bottom block
      ctx.fillRect(ob.x - 18, gapBot, 36, tunnelBot - gapBot)
      ctx.restore()
    }

    // player
    const px = W * 0.25
    const py = s.playerY
    ctx.save()
    ctx.shadowBlur = 35
    ctx.shadowColor = '#9b5de5'
    ctx.fillStyle = '#9b5de5'
    if (s.onFloor) {
      ctx.beginPath()
      ctx.moveTo(px, py - PLAYER_SIZE)
      ctx.lineTo(px + PLAYER_SIZE * 0.6, py + PLAYER_SIZE * 0.5)
      ctx.lineTo(px - PLAYER_SIZE * 0.6, py + PLAYER_SIZE * 0.5)
      ctx.closePath()
    } else {
      // flipped triangle
      ctx.beginPath()
      ctx.moveTo(px, py + PLAYER_SIZE)
      ctx.lineTo(px + PLAYER_SIZE * 0.6, py - PLAYER_SIZE * 0.5)
      ctx.lineTo(px - PLAYER_SIZE * 0.6, py - PLAYER_SIZE * 0.5)
      ctx.closePath()
    }
    ctx.fill()
    ctx.restore()

    if (s.flash > 0) {
      ctx.save()
      ctx.globalAlpha = s.flash * 0.35
      ctx.fillStyle = '#ff006e'
      ctx.fillRect(0, 0, W, H)
      ctx.restore()
    }

    // score
    ctx.save()
    ctx.font = `700 ${Math.round(H * 0.045)}px Orbitron, monospace`
    ctx.fillStyle = '#f0f0f5'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowBlur = 16
    ctx.shadowColor = '#9b5de5'
    ctx.fillText(String(s.score), W / 2, H / 2)
    ctx.restore()
  }, [])

  const checkCollision = useCallback((W: number, H: number): boolean => {
    const s = stateRef.current
    if (s.playerY < 0) return false // not yet initialized
    const tunnelTop = H * TUNNEL_MARGIN
    const tunnelBot = H * (1 - TUNNEL_MARGIN)
    const px = W * 0.25, py = s.playerY
    const pr = PLAYER_SIZE * 0.6  // must be < 0.7×PLAYER_SIZE (the wall offset)

    if (py - pr < tunnelTop || py + pr > tunnelBot) return true
    for (const ob of s.obstacles) {
      if (Math.abs(ob.x - px) > 36) continue
      const gapTop = ob.gapY - ob.gapH / 2
      const gapBot = ob.gapY + ob.gapH / 2
      if (py - pr < gapTop || py + pr > gapBot) return true
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

    // Wait until canvas has real dimensions (default canvas is 300×150)
    if (W < 100 || H < 200) {
      s.rafId = requestAnimationFrame(loop)
      return
    }

    const tunnelTop = H * TUNNEL_MARGIN
    const tunnelBot = H * (1 - TUNNEL_MARGIN)

    // Initialize playerY on first valid frame
    if (s.playerY < 0) {
      s.playerY = tunnelBot - PLAYER_SIZE * 0.7
    }

    const dt = s.lastTime ? Math.min((ts - s.lastTime) / 1000, 0.05) : 0.016
    s.lastTime = ts

    const speedMult = reducedMotion ? 0.6 : 1
    const spd = s.speed * speedMult

    // move obstacles
    for (const ob of s.obstacles) {
      ob.x -= spd * dt
    }
    s.obstacles = s.obstacles.filter(ob => ob.x > -40)

    // spawn
    s.spawnTimer += dt
    if (s.spawnTimer >= s.spawnInterval) {
      s.spawnTimer = 0
      const gapH = Math.max(80, s.tunnelH * 0.42 - s.score * 0.8)
      const margin = 30
      const gapY = tunnelTop + margin + Math.random() * (s.tunnelH - gapH - margin * 2) + gapH / 2
      s.obstacles.push({ x: W + 20, gapY, gapH })
    }

    // player snap to floor/ceiling
    const targetY = s.onFloor ? tunnelBot - PLAYER_SIZE * 0.7 : tunnelTop + PLAYER_SIZE * 0.7
    s.playerY += (targetY - s.playerY) * (reducedMotion ? 1 : Math.min(1, dt * 22))

    s.dist += spd * dt
    s.score = Math.floor(s.dist / 80)
    s.speed = 180 + s.score * 3

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
    s.onFloor = !s.onFloor
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
    const canvas = canvasRef.current
    if (isActive && canvas) {
      const H = canvas.offsetHeight
      const tunnelBot = H * (1 - TUNNEL_MARGIN)
      s.playerY = -1 // reset sentinel; loop will initialize from real canvas dims
      s.onFloor = true
      s.obstacles = []
      s.score = 0
      s.speed = 180
      s.spawnTimer = 0
      s.spawnInterval = 1.5
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
