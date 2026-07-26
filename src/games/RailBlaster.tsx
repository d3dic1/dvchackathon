import { useCallback, useEffect, useRef } from 'react'
import { GameProps } from '../types/game'
import { hapticError, hapticLight } from '../utils/haptics'
import { playSound } from '../utils/audio'

interface Target {
  id: number
  x: number
  y: number
  radius: number
  life: number
  maxLife: number
  kind: 'bot' | 'star'
}

const INK = '#29445e'
const CREAM = '#fffdf7'
const ORANGE = '#ff5b35'
const LIME = '#8cff69'
const BLUE = '#2a78d1'

export default function RailBlaster({ isActive, onScore, onGameOver, reducedMotion, soundEnabled }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointerRef = useRef({ id: -1, x: 0, y: 0, moved: false })
  const stateRef = useRef({
    targets: [] as Target[],
    nextId: 1,
    score: 0,
    combo: 0,
    spawnTimer: .2,
    spawnInterval: 1.15,
    running: false,
    rafId: 0,
    lastTime: 0,
    flash: 0,
    crossX: -100,
    crossY: -100,
  })

  const endRun = useCallback(() => {
    const state = stateRef.current
    if (!state.running) return
    state.running = false
    state.flash = 1
    hapticError()
    playSound('fail', soundEnabled)
    onGameOver(state.score)
  }, [onGameOver, soundEnabled])

  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const state = stateRef.current
    const sky = ctx.createLinearGradient(0, 0, 0, height)
    sky.addColorStop(0, '#101d4f')
    sky.addColorStop(.55, '#204f8c')
    sky.addColorStop(1, '#102844')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, width, height)

    ctx.fillStyle = 'rgba(255,255,255,.16)'
    for (let x = 0; x < width; x += 52) {
      ctx.fillRect(x, height * .18, 3, height * .64)
      ctx.fillRect(0, height * .18 + x, width, 3)
    }
    ctx.fillStyle = '#0a1735'
    ctx.fillRect(0, height * .76, width, height * .24)
    ctx.strokeStyle = BLUE
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(0, height * .78)
    ctx.lineTo(width, height * .78)
    ctx.stroke()

    for (const target of state.targets) {
      const pulse = .9 + Math.sin(target.life * 12) * .05
      ctx.save()
      ctx.translate(target.x, target.y)
      ctx.scale(pulse, pulse)
      ctx.globalAlpha = Math.min(1, target.life * 4)
      ctx.fillStyle = target.kind === 'bot' ? ORANGE : LIME
      ctx.strokeStyle = CREAM
      ctx.lineWidth = 5
      if (target.kind === 'bot') {
        ctx.beginPath()
        ctx.roundRect(-target.radius, -target.radius, target.radius * 2, target.radius * 2, 10)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = INK
        ctx.fillRect(-target.radius * .48, -target.radius * .25, target.radius * .3, target.radius * .3)
        ctx.fillRect(target.radius * .18, -target.radius * .25, target.radius * .3, target.radius * .3)
        ctx.beginPath()
        ctx.moveTo(-target.radius * .42, target.radius * .35)
        ctx.lineTo(target.radius * .42, target.radius * .35)
        ctx.stroke()
      } else {
        ctx.beginPath()
        for (let point = 0; point < 10; point++) {
          const angle = -Math.PI / 2 + point * Math.PI / 5
          const radius = point % 2 ? target.radius * .42 : target.radius
          const x = Math.cos(angle) * radius
          const y = Math.sin(angle) * radius
          if (point === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }
      ctx.restore()
    }

    if (state.crossX > 0) {
      ctx.strokeStyle = CREAM
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(state.crossX, state.crossY, 18, 0, Math.PI * 2)
      ctx.moveTo(state.crossX - 27, state.crossY)
      ctx.lineTo(state.crossX + 27, state.crossY)
      ctx.moveTo(state.crossX, state.crossY - 27)
      ctx.lineTo(state.crossX, state.crossY + 27)
      ctx.stroke()
    }

    ctx.fillStyle = CREAM
    ctx.textAlign = 'center'
    const headerY = Math.max(height * .22, Math.min(width * .38, height * .32))
    ctx.font = `900 ${Math.max(16, height * .024)}px "Archivo Black", sans-serif`
    ctx.fillText('BLAST BOTS · SPARE STARS', width / 2, headerY)
    ctx.font = `500 ${Math.max(10, height * .014)}px "DM Mono", monospace`
    ctx.fillText(state.combo > 1 ? `${state.combo} HIT COMBO` : 'ONE BAD SHOT ENDS IT', width / 2, headerY + height * .035)

    if (state.flash > 0) {
      ctx.globalAlpha = state.flash * .5
      ctx.fillStyle = ORANGE
      ctx.fillRect(0, 0, width, height)
      ctx.globalAlpha = 1
    }
  }, [])

  const spawnTarget = useCallback((width: number, height: number) => {
    const state = stateRef.current
    const radius = Math.max(24, width * Math.max(.065, .105 - state.score * .00008))
    const kind = state.score > 40 && Math.random() < .24 ? 'star' : 'bot'
    const maxLife = Math.max(.52, 1.35 - state.score * .004)
    state.targets.push({
      id: state.nextId++,
      x: radius + Math.random() * (width - radius * 2),
      y: height * .3 + Math.random() * (height * .38),
      radius,
      life: maxLife,
      maxLife,
      kind,
    })
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
    state.spawnTimer += dt * pace
    state.flash = Math.max(0, state.flash - dt * 5)
    state.targets.forEach(target => { target.life -= dt * pace })
    if (state.targets.some(target => target.kind === 'bot' && target.life <= 0)) {
      draw(context, canvas.width, canvas.height)
      endRun()
      return
    }
    state.targets = state.targets.filter(target => target.life > 0)
    if (state.spawnTimer >= state.spawnInterval) {
      state.spawnTimer = 0
      spawnTarget(canvas.width, canvas.height)
      state.spawnInterval = Math.max(.42, 1.15 - state.score * .003)
    }
    draw(context, canvas.width, canvas.height)
    state.rafId = requestAnimationFrame(loop)
  }, [draw, endRun, reducedMotion, spawnTarget])

  const shoot = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    const state = stateRef.current
    if (!canvas || !state.running) return
    const rect = canvas.getBoundingClientRect()
    const x = (clientX - rect.left) * canvas.width / rect.width
    const y = (clientY - rect.top) * canvas.height / rect.height
    state.crossX = x
    state.crossY = y
    const hit = [...state.targets]
      .reverse()
      .find(target => Math.hypot(target.x - x, target.y - y) <= target.radius * 1.12)
    if (!hit || hit.kind === 'star') {
      endRun()
      return
    }
    state.targets = state.targets.filter(target => target.id !== hit.id)
    state.combo += 1
    const speedBonus = Math.ceil(hit.life / hit.maxLife * 10)
    state.score += (10 + speedBonus) * Math.min(8, state.combo)
    onScore(state.score)
    hapticLight()
    playSound('success', soundEnabled)
  }, [endRun, onScore, soundEnabled])

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
        targets: [], nextId: 1, score: 0, combo: 0, spawnTimer: .55,
        spawnInterval: 1.15, running: true, lastTime: 0, flash: 0,
        crossX: -100, crossY: -100,
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
      aria-label="Rail Blaster. Tap orange bots before they vanish and never shoot green stars."
      onPointerDown={event => {
        pointerRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false }
      }}
      onPointerMove={event => {
        const pointer = pointerRef.current
        if (pointer.id === event.pointerId && Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 12) {
          pointer.moved = true
        }
      }}
      onPointerUp={event => {
        const pointer = pointerRef.current
        if (pointer.id === event.pointerId && !pointer.moved) shoot(event.clientX, event.clientY)
        pointer.id = -1
      }}
      onPointerCancel={() => { pointerRef.current.id = -1 }}
      onKeyDown={event => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        const canvas = canvasRef.current
        const target = stateRef.current.targets.find(item => item.kind === 'bot')
        if (!canvas || !target) return
        const rect = canvas.getBoundingClientRect()
        shoot(
          rect.left + target.x * rect.width / canvas.width,
          rect.top + target.y * rect.height / canvas.height,
        )
      }}
    />
  )
}
