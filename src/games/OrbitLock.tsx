import { useEffect, useRef, useCallback } from 'react'
import { GameProps } from '../types/game'
import { hapticLight, hapticError } from '../utils/haptics'

export default function OrbitLock({ isActive, onScore, onGameOver, reducedMotion }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({
    angle: 0,
    targetStart: Math.PI * 0.8,
    targetSize: 0.35,
    speed: 1.8,
    score: 0,
    combo: 0,
    running: false,
    rafId: 0,
    targetMoving: 0,
    lastTime: 0,
    flash: 0,
    hitFlash: '',
  })

  const draw = useCallback((ctx: CanvasRenderingContext2D, W: number, H: number) => {
    const s = stateRef.current
    const cx = W / 2, cy = H / 2
    const r = Math.min(W, H) * 0.34

    ctx.clearRect(0, 0, W, H)

    // bg
    ctx.fillStyle = '#0a0a0f'
    ctx.fillRect(0, 0, W, H)

    // outer glow ring
    ctx.save()
    ctx.shadowBlur = 24
    ctx.shadowColor = '#c8ff0044'
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.strokeStyle = '#1e2a10'
    ctx.lineWidth = 18
    ctx.stroke()
    ctx.restore()

    // track
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.strokeStyle = '#1c1c2a'
    ctx.lineWidth = 14
    ctx.stroke()

    // target zone
    const tEnd = s.targetStart + s.targetSize
    ctx.save()
    ctx.shadowBlur = 30
    ctx.shadowColor = '#c8ff00'
    ctx.beginPath()
    ctx.arc(cx, cy, r, s.targetStart, tEnd)
    ctx.strokeStyle = '#c8ff00'
    ctx.lineWidth = 14
    ctx.stroke()
    ctx.restore()

    // hit flash
    if (s.flash > 0) {
      ctx.save()
      ctx.globalAlpha = s.flash
      ctx.shadowBlur = 60
      ctx.shadowColor = s.hitFlash
      ctx.beginPath()
      ctx.arc(cx, cy, r + 10, 0, Math.PI * 2)
      ctx.strokeStyle = s.hitFlash
      ctx.lineWidth = 6
      ctx.stroke()
      ctx.restore()
    }

    // marker
    const mx = cx + Math.cos(s.angle) * r
    const my = cy + Math.sin(s.angle) * r
    ctx.save()
    ctx.shadowBlur = 40
    ctx.shadowColor = '#00e5ff'
    ctx.beginPath()
    ctx.arc(mx, my, 11, 0, Math.PI * 2)
    ctx.fillStyle = '#00e5ff'
    ctx.fill()
    ctx.restore()

    // center score
    ctx.save()
    ctx.font = `700 ${Math.round(H * 0.055)}px Orbitron, monospace`
    ctx.fillStyle = '#f0f0f5'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowBlur = 16
    ctx.shadowColor = '#c8ff00'
    ctx.fillText(String(s.score), cx, cy - 14)
    ctx.font = `500 ${Math.round(H * 0.028)}px Inter, sans-serif`
    ctx.fillStyle = '#6b6b7a'
    ctx.shadowBlur = 0
    ctx.fillText(s.combo > 1 ? `×${s.combo} combo` : 'tap at the target', cx, cy + 22)
    ctx.restore()
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

    const speedMult = reducedMotion ? 0.5 : 1
    s.angle += s.speed * speedMult * dt
    if (s.angle > Math.PI * 2) s.angle -= Math.PI * 2

    // slowly move target zone
    s.targetMoving += 0.18 * dt
    s.targetStart = (Math.sin(s.targetMoving) * 0.5 + 0.5) * Math.PI * 2

    if (s.flash > 0) s.flash -= dt * 3

    draw(ctx, W, H)
    s.rafId = requestAnimationFrame(loop)
  }, [draw, reducedMotion])

  const tap = useCallback(() => {
    const s = stateRef.current
    if (!s.running) return
    const norm = ((s.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
    const tEnd = (s.targetStart + s.targetSize)
    const inZone = norm >= s.targetStart && norm <= tEnd

    if (inZone) {
      s.combo++
      s.score += s.combo
      s.speed = Math.min(1.8 + s.combo * 0.15, 7)
      s.targetSize = Math.max(0.18, 0.35 - s.combo * 0.012)
      s.flash = 1
      s.hitFlash = '#c8ff00'
      hapticLight()
      onScore(s.score)
    } else {
      s.flash = 1
      s.hitFlash = '#ff006e'
      hapticError()
      s.running = false
      cancelAnimationFrame(s.rafId)
      onGameOver(s.score)
    }
  }, [onScore, onGameOver])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const s = stateRef.current
    if (isActive) {
      s.angle = 0
      s.targetStart = Math.PI * 0.8
      s.targetSize = 0.35
      s.speed = 1.8
      s.score = 0
      s.combo = 0
      s.flash = 0
      s.targetMoving = 0
      s.lastTime = 0
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
