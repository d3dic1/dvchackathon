import { PointerEvent, useCallback, useEffect, useRef } from 'react'
import { GameProps } from '../types/game'
import { hapticError, hapticLight } from '../utils/haptics'
import { playSound } from '../utils/audio'

type Lane = 0 | 1 | 2
type HazardKind = 'barrier' | 'sign' | 'cab'

interface Hazard {
  lane: Lane
  z: number
  kind: HazardKind
  resolved: boolean
}

interface Token {
  lane: Lane
  z: number
  collected: boolean
}

const INK = '#121212'
const CREAM = '#f5e7c6'
const ORANGE = '#f04a24'
const BLUE = '#123fc5'
const SKY = '#78d8ff'
const LIME = '#d7ff2f'

const randomLane = (): Lane => Math.floor(Math.random() * 3) as Lane

export default function CitySprint({
  isActive,
  onScore,
  onGameOver,
  reducedMotion,
  soundEnabled,
}: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointerRef = useRef({ id: -1, x: 0, y: 0 })
  const stateRef = useRef({
    lane: 1 as Lane,
    visualLane: 1,
    hazards: [] as Hazard[],
    tokens: [] as Token[],
    running: false,
    rafId: 0,
    lastTime: 0,
    elapsed: 0,
    distance: 0,
    bonus: 0,
    score: 0,
    speed: .245,
    spawnTimer: 0,
    spawnInterval: 1.02,
    jumpTimer: 0,
    slideTimer: 0,
    multiplier: 1,
    streakTimer: 0,
    nearMisses: 0,
    flash: 0,
    shake: 0,
  })

  const roadAt = useCallback((width: number, height: number, z: number) => {
    const horizon = height * .22
    const eased = Math.pow(Math.max(0, Math.min(1, z)), 1.55)
    const roadWidth = width * (.12 + eased * .86)
    return {
      y: horizon + eased * (height - horizon),
      left: width / 2 - roadWidth / 2,
      width: roadWidth,
      scale: .16 + eased * 1.12,
    }
  }, [])

  const laneX = useCallback((width: number, height: number, z: number, lane: number) => {
    const road = roadAt(width, height, z)
    return road.left + road.width * ((lane + .5) / 3)
  }, [roadAt])

  const draw = useCallback((context: CanvasRenderingContext2D, width: number, height: number) => {
    const state = stateRef.current
    const horizon = height * .22
    const unit = Math.min(width, height) / 430

    const sky = context.createLinearGradient(0, 0, 0, horizon * 2.5)
    sky.addColorStop(0, SKY)
    sky.addColorStop(1, CREAM)
    context.fillStyle = sky
    context.fillRect(0, 0, width, height)

    context.fillStyle = 'rgba(18,63,197,.13)'
    for (let ray = -6; ray <= 6; ray++) {
      context.beginPath()
      context.moveTo(width / 2, horizon)
      context.lineTo(width / 2 + ray * width * .18, 0)
      context.lineTo(width / 2 + (ray + .45) * width * .18, 0)
      context.closePath()
      context.fill()
    }

    const buildingOffset = (state.distance * .45) % (44 * unit)
    for (let side = 0; side < 2; side++) {
      const direction = side === 0 ? -1 : 1
      for (let index = 0; index < 6; index++) {
        const buildingWidth = (44 + (index % 3) * 13) * unit
        const buildingHeight = (95 + (index % 4) * 34) * unit
        const x = side === 0
          ? width * .34 - index * 54 * unit - buildingOffset
          : width * .66 + index * 54 * unit + buildingOffset
        context.fillStyle = index % 2 ? ORANGE : BLUE
        context.strokeStyle = INK
        context.lineWidth = 3 * unit
        context.fillRect(x - (side === 0 ? buildingWidth : 0), horizon - buildingHeight, buildingWidth, buildingHeight)
        context.strokeRect(x - (side === 0 ? buildingWidth : 0), horizon - buildingHeight, buildingWidth, buildingHeight)
        context.fillStyle = LIME
        const startX = x - (side === 0 ? buildingWidth : 0) + 10 * unit
        for (let row = 0; row < 4; row++) {
          for (let column = 0; column < 2; column++) {
            context.fillRect(startX + column * 19 * unit, horizon - buildingHeight + (18 + row * 21) * unit, 8 * unit, 9 * unit)
          }
        }
      }
      context.save()
      context.translate(width / 2 + direction * width * .35, horizon * .52)
      context.rotate(direction * .08)
      context.fillStyle = CREAM
      context.strokeStyle = INK
      context.lineWidth = 3 * unit
      context.fillRect(-62 * unit, -17 * unit, 124 * unit, 34 * unit)
      context.strokeRect(-62 * unit, -17 * unit, 124 * unit, 34 * unit)
      context.fillStyle = INK
      context.font = `900 ${12 * unit}px "DM Mono", monospace`
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillText(side === 0 ? 'CITY LOOP' : 'NO BRAKES', 0, 1 * unit)
      context.restore()
    }

    context.fillStyle = '#23243a'
    context.beginPath()
    context.moveTo(width * .44, horizon)
    context.lineTo(width * .015, height)
    context.lineTo(width * .985, height)
    context.lineTo(width * .56, horizon)
    context.closePath()
    context.fill()

    context.strokeStyle = CREAM
    context.lineWidth = 4 * unit
    for (let divider = 1; divider <= 2; divider++) {
      context.setLineDash([18 * unit, 16 * unit])
      context.beginPath()
      context.moveTo(width * (.44 + divider * .04), horizon)
      context.lineTo(width * (divider / 3), height)
      context.stroke()
    }
    context.setLineDash([])
    context.strokeStyle = ORANGE
    context.lineWidth = 9 * unit
    context.beginPath()
    context.moveTo(width * .44, horizon)
    context.lineTo(width * .015, height)
    context.moveTo(width * .56, horizon)
    context.lineTo(width * .985, height)
    context.stroke()

    const drawToken = (token: Token) => {
      const road = roadAt(width, height, token.z)
      const x = laneX(width, height, token.z, token.lane)
      const radius = 12 * road.scale * unit
      context.save()
      context.translate(x, road.y - radius * 1.6)
      context.rotate(state.elapsed * 3.2 + token.z)
      context.fillStyle = LIME
      context.strokeStyle = INK
      context.lineWidth = Math.max(2, 3 * road.scale * unit)
      context.beginPath()
      for (let point = 0; point < 12; point++) {
        const angle = point / 12 * Math.PI * 2
        const size = point % 2 ? radius * .7 : radius
        const px = Math.cos(angle) * size
        const py = Math.sin(angle) * size
        if (point === 0) context.moveTo(px, py)
        else context.lineTo(px, py)
      }
      context.closePath()
      context.fill()
      context.stroke()
      context.restore()
    }

    const drawHazard = (hazard: Hazard) => {
      const road = roadAt(width, height, hazard.z)
      const x = laneX(width, height, hazard.z, hazard.lane)
      const laneWidth = road.width / 3
      const objectWidth = laneWidth * .72
      const baseY = road.y
      context.save()
      context.translate(x, baseY)
      context.lineWidth = Math.max(2, 4 * road.scale * unit)
      context.strokeStyle = INK

      if (hazard.kind === 'barrier') {
        const objectHeight = 32 * road.scale * unit
        context.fillStyle = ORANGE
        context.fillRect(-objectWidth / 2, -objectHeight, objectWidth, objectHeight)
        context.strokeRect(-objectWidth / 2, -objectHeight, objectWidth, objectHeight)
        context.strokeStyle = CREAM
        context.lineWidth = Math.max(2, 5 * road.scale * unit)
        for (let stripe = -objectWidth / 2; stripe < objectWidth / 2; stripe += 25 * road.scale * unit) {
          context.beginPath()
          context.moveTo(stripe, -objectHeight)
          context.lineTo(stripe + 18 * road.scale * unit, 0)
          context.stroke()
        }
      } else if (hazard.kind === 'sign') {
        const objectHeight = 92 * road.scale * unit
        context.fillStyle = BLUE
        context.fillRect(-objectWidth / 2, -objectHeight, 9 * road.scale * unit, objectHeight)
        context.fillRect(objectWidth / 2 - 9 * road.scale * unit, -objectHeight, 9 * road.scale * unit, objectHeight)
        context.fillStyle = LIME
        context.fillRect(-objectWidth / 2, -objectHeight, objectWidth, 34 * road.scale * unit)
        context.strokeRect(-objectWidth / 2, -objectHeight, objectWidth, 34 * road.scale * unit)
      } else {
        const objectHeight = 104 * road.scale * unit
        context.fillStyle = hazard.lane % 2 ? ORANGE : BLUE
        context.fillRect(-objectWidth / 2, -objectHeight, objectWidth, objectHeight)
        context.strokeRect(-objectWidth / 2, -objectHeight, objectWidth, objectHeight)
        context.fillStyle = SKY
        context.fillRect(-objectWidth * .34, -objectHeight * .78, objectWidth * .68, objectHeight * .28)
        context.strokeRect(-objectWidth * .34, -objectHeight * .78, objectWidth * .68, objectHeight * .28)
        context.fillStyle = LIME
        context.fillRect(-objectWidth * .34, -objectHeight * .3, objectWidth * .68, objectHeight * .1)
      }
      context.restore()
    }

    state.tokens.filter(token => !token.collected).sort((a, b) => a.z - b.z).forEach(drawToken)
    state.hazards.sort((a, b) => a.z - b.z).forEach(drawHazard)

    state.visualLane += (state.lane - state.visualLane) * (reducedMotion ? .38 : .2)
    const jumpProgress = state.jumpTimer > 0 ? 1 - state.jumpTimer / .72 : 0
    const jumpHeight = state.jumpTimer > 0 ? Math.sin(jumpProgress * Math.PI) : 0
    const playerRoad = roadAt(width, height, .83)
    const playerX = laneX(width, height, .83, state.visualLane)
    const playerY = playerRoad.y - jumpHeight * height * .19
    const sliding = state.slideTimer > 0

    context.save()
    const shake = reducedMotion ? 0 : state.shake * unit
    context.translate(playerX + (Math.random() - .5) * shake, playerY + (Math.random() - .5) * shake)
    context.rotate((state.visualLane - state.lane) * .16)
    const playerHeight = (sliding ? 35 : 64) * unit
    const playerWidth = (sliding ? 56 : 38) * unit
    context.fillStyle = LIME
    context.strokeStyle = INK
    context.lineWidth = 5 * unit
    context.fillRect(-playerWidth / 2, -playerHeight, playerWidth, playerHeight)
    context.strokeRect(-playerWidth / 2, -playerHeight, playerWidth, playerHeight)
    context.fillStyle = ORANGE
    context.fillRect(-playerWidth * .32, -playerHeight * .72, playerWidth * .64, playerHeight * .2)
    context.fillStyle = CREAM
    context.fillRect(-playerWidth * .58, -4 * unit, playerWidth * 1.16, 9 * unit)
    context.strokeRect(-playerWidth * .58, -4 * unit, playerWidth * 1.16, 9 * unit)
    context.restore()

    const headerY = Math.max(horizon + 8 * unit, height * .18)
    const streakY = headerY + 30 * unit
    context.fillStyle = INK
    context.fillRect(14 * unit, streakY, 132 * unit, 44 * unit)
    context.fillStyle = LIME
    context.font = `900 ${21 * unit}px "Archivo Black", sans-serif`
    context.textAlign = 'left'
    context.fillText(`x${state.multiplier}`, 25 * unit, streakY + 28 * unit)
    context.fillStyle = CREAM
    context.font = `700 ${8 * unit}px "DM Mono", monospace`
    context.fillText('TOKEN STREAK', 65 * unit, streakY + 25 * unit)

    context.textAlign = 'center'
    context.fillStyle = CREAM
    context.strokeStyle = INK
    context.lineWidth = 6 * unit
    context.font = `900 ${Math.max(20, 30 * unit)}px "Archivo Black", sans-serif`
    context.strokeText('CITY SPRINT', width / 2, headerY)
    context.fillText('CITY SPRINT', width / 2, headerY)
    context.fillStyle = INK
    context.font = `700 ${9 * unit}px "DM Mono", monospace`
    context.fillText(`SPEED ${Math.round(state.speed * 1000)}  ·  NEAR MISSES ${state.nearMisses}`, width / 2, headerY + 20 * unit)

    if (state.flash > 0) {
      context.globalAlpha = state.flash * .55
      context.fillStyle = state.running ? LIME : ORANGE
      context.fillRect(0, 0, width, height)
      context.globalAlpha = 1
    }
  }, [laneX, reducedMotion, roadAt])

  const finish = useCallback(() => {
    const state = stateRef.current
    if (!state.running) return
    state.running = false
    state.flash = 1
    state.shake = 20
    hapticError()
    playSound('fail', soundEnabled)
    onGameOver(state.score)
  }, [onGameOver, soundEnabled])

  const spawnRow = useCallback(() => {
    const state = stateRef.current
    const doubleRow = state.elapsed > 18 && Math.random() < Math.min(.38, state.elapsed / 150)
    if (doubleRow) {
      const openLane = randomLane()
      ;([0, 1, 2] as Lane[]).filter(lane => lane !== openLane).forEach(lane => {
        state.hazards.push({ lane, z: .015, kind: 'cab', resolved: false })
      })
      state.tokens.push({ lane: openLane, z: .015, collected: false })
      return
    }

    const lane = randomLane()
    const roll = Math.random()
    const kind: HazardKind = roll < .36 ? 'barrier' : roll < .68 ? 'sign' : 'cab'
    state.hazards.push({ lane, z: .015, kind, resolved: false })
    const tokenLane = Math.random() < .65 ? ((lane + 1 + Math.floor(Math.random() * 2)) % 3) as Lane : lane
    state.tokens.push({ lane: tokenLane, z: -.04, collected: false })
  }, [])

  const loop = useCallback((time: number) => {
    const canvas = canvasRef.current
    const state = stateRef.current
    if (!canvas || !state.running) return
    const context = canvas.getContext('2d')
    if (!context) return
    const dt = state.lastTime ? Math.min((time - state.lastTime) / 1000, .045) : .016
    state.lastTime = time
    state.elapsed += dt
    state.jumpTimer = Math.max(0, state.jumpTimer - dt)
    state.slideTimer = Math.max(0, state.slideTimer - dt)
    state.streakTimer = Math.max(0, state.streakTimer - dt)
    state.flash = Math.max(0, state.flash - dt * 5)
    state.shake = Math.max(0, state.shake - dt * 30)
    if (state.streakTimer === 0) state.multiplier = 1

    state.speed = Math.min(.58, .245 + state.elapsed * .0032)
    const motionSpeed = state.speed * (reducedMotion ? .8 : 1)
    state.distance += motionSpeed * dt * 132
    state.hazards.forEach(hazard => { hazard.z += motionSpeed * dt })
    state.tokens.forEach(token => { token.z += motionSpeed * dt })

    const jumpProgress = state.jumpTimer > 0 ? 1 - state.jumpTimer / .72 : 0
    const jumpHeight = state.jumpTimer > 0 ? Math.sin(jumpProgress * Math.PI) : 0
    for (const hazard of state.hazards) {
      if (hazard.resolved || hazard.z < .79) continue
      if (hazard.z > .93) {
        hazard.resolved = true
        continue
      }
      if (hazard.lane !== state.lane) {
        if (Math.abs(hazard.lane - state.lane) === 1) {
          hazard.resolved = true
          state.nearMisses += 1
          state.bonus += 12 * state.multiplier
          state.flash = .28
          playSound('tap', soundEnabled)
        }
        continue
      }
      const cleared = hazard.kind === 'barrier'
        ? jumpHeight > .42
        : hazard.kind === 'sign'
          ? state.slideTimer > .08
          : false
      if (!cleared) {
        finish()
        draw(context, canvas.width, canvas.height)
        return
      }
      hazard.resolved = true
      state.bonus += 18 * state.multiplier
      playSound('success', soundEnabled)
    }

    for (const token of state.tokens) {
      if (token.collected || token.z < .77 || token.z > .94 || token.lane !== state.lane) continue
      token.collected = true
      state.multiplier = Math.min(5, state.multiplier + 1)
      state.streakTimer = 2.4
      state.bonus += 25 * state.multiplier
      state.flash = .42
      hapticLight()
      playSound(state.multiplier === 5 ? 'milestone' : 'success', soundEnabled)
    }

    state.hazards = state.hazards.filter(hazard => hazard.z < 1.12)
    state.tokens = state.tokens.filter(token => token.z < 1.12)
    state.spawnTimer += dt
    state.spawnInterval = Math.max(.5, 1.02 - state.elapsed * .006)
    if (state.spawnTimer >= state.spawnInterval) {
      state.spawnTimer = 0
      spawnRow()
    }

    const nextScore = Math.floor(state.distance / 5) * 5 + state.bonus
    if (nextScore !== state.score) {
      state.score = nextScore
      onScore(state.score)
    }

    draw(context, canvas.width, canvas.height)
    state.rafId = requestAnimationFrame(loop)
  }, [draw, finish, onScore, reducedMotion, soundEnabled, spawnRow])

  const move = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    const state = stateRef.current
    if (!state.running) return
    if (direction === 'left') state.lane = Math.max(0, state.lane - 1) as Lane
    if (direction === 'right') state.lane = Math.min(2, state.lane + 1) as Lane
    if (direction === 'up' && state.slideTimer === 0) state.jumpTimer = .72
    if (direction === 'down' && state.jumpTimer === 0) state.slideTimer = .64
    hapticLight()
    playSound('tap', soundEnabled)
  }, [soundEnabled])

  const handlePointerDown = useCallback((event: PointerEvent<HTMLCanvasElement>) => {
    if (!stateRef.current.running) return
    event.currentTarget.setPointerCapture(event.pointerId)
    pointerRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
  }, [])

  const handlePointerUp = useCallback((event: PointerEvent<HTMLCanvasElement>) => {
    const pointer = pointerRef.current
    if (pointer.id !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    const deltaX = event.clientX - pointer.x
    const deltaY = event.clientY - pointer.y
    pointerRef.current.id = -1
    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 18) {
      move('up')
      return
    }
    if (Math.abs(deltaX) > Math.abs(deltaY)) move(deltaX < 0 ? 'left' : 'right')
    else move(deltaY < 0 ? 'up' : 'down')
  }, [move])

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
        lane: 1,
        visualLane: 1,
        hazards: [],
        tokens: [],
        running: true,
        lastTime: 0,
        elapsed: 0,
        distance: 0,
        bonus: 0,
        score: 0,
        speed: .245,
        spawnTimer: .45,
        spawnInterval: 1.02,
        jumpTimer: 0,
        slideTimer: 0,
        multiplier: 1,
        streakTimer: 0,
        nearMisses: 0,
        flash: 0,
        shake: 0,
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
      className="game-canvas city-sprint-game"
      role="button"
      tabIndex={0}
      aria-label="City Sprint. Swipe left and right to change lanes, up to jump, and down to slide."
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { pointerRef.current.id = -1 }}
      onKeyDown={event => {
        const controls: Record<string, 'left' | 'right' | 'up' | 'down'> = {
          ArrowLeft: 'left',
          a: 'left',
          ArrowRight: 'right',
          d: 'right',
          ArrowUp: 'up',
          w: 'up',
          ' ': 'up',
          ArrowDown: 'down',
          s: 'down',
        }
        const direction = controls[event.key]
        if (!direction) return
        event.preventDefault()
        move(direction)
      }}
    />
  )
}
