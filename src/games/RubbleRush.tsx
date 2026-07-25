import { PointerEvent, useCallback, useEffect, useRef } from 'react'
import { GameProps } from '../types/game'
import { hapticError, hapticLight } from '../utils/haptics'
import { playSound } from '../utils/audio'

const INK = '#121212'
const CREAM = '#fff5dc'
const ORANGE = '#f04a24'
const BLUE = '#123fc5'
const LIME = '#d7ff2f'

type Phase = 'aiming' | 'flying' | 'success' | 'failed'
type BlockMaterial = 'wood' | 'glass' | 'armor' | 'bomb'

const towerRows = (round: number) => 4 + Math.min(2, Math.floor((round - 1) / 3))

interface TowerBlock {
  x: number
  y: number
  width: number
  height: number
  material: BlockMaterial
  hp: number
  maxHp: number
  falling: boolean
  velocityX: number
  velocityY: number
  rotation: number
  rotationSpeed: number
  lastHitAt: number
}

interface Debris {
  x: number
  y: number
  velocityX: number
  velocityY: number
  size: number
  color: string
  life: number
}

interface RubbleState {
  running: boolean
  phase: Phase
  rafId: number
  lastTime: number
  round: number
  score: number
  anchorX: number
  anchorY: number
  ballX: number
  ballY: number
  velocityX: number
  velocityY: number
  dragX: number
  dragY: number
  pointerId: number
  targetX: number
  targetY: number
  targetRadius: number
  wind: number
  shotTime: number
  bounces: number
  transitionAt: number
  flash: number
  shake: number
  blocksDestroyed: number
  blocks: TowerBlock[]
  debris: Debris[]
  message: string
}

const initialState: RubbleState = {
  running: false,
  phase: 'aiming',
  rafId: 0,
  lastTime: 0,
  round: 1,
  score: 0,
  anchorX: 0,
  anchorY: 0,
  ballX: 0,
  ballY: 0,
  velocityX: 0,
  velocityY: 0,
  dragX: -58,
  dragY: 38,
  pointerId: -1,
  targetX: 0,
  targetY: 0,
  targetRadius: 28,
  wind: 0,
  shotTime: 0,
  bounces: 0,
  transitionAt: 0,
  flash: 0,
  shake: 0,
  blocksDestroyed: 0,
  blocks: [],
  debris: [],
  message: 'PULL + RELEASE',
}

const materialColor: Record<BlockMaterial, string> = {
  wood: CREAM,
  glass: '#78d8ff',
  armor: BLUE,
  bomb: ORANGE,
}

function chooseMaterial(round: number, row: number, column: number): BlockMaterial {
  if (round >= 5 && (row + column + round) % 5 === 0) return 'armor'
  if (round >= 3 && (row * 2 + column + round) % 7 === 0) return 'bomb'
  if ((row * 2 + column + round) % 4 === 0) return 'glass'
  return 'wood'
}

function blockBonus(material: BlockMaterial): number {
  if (material === 'glass') return 35
  if (material === 'armor') return 55
  if (material === 'bomb') return 45
  return 25
}

function scatterBlock(state: RubbleState, block: TowerBlock, forceX: number, forceY: number) {
  block.falling = true
  block.velocityX = forceX
  block.velocityY = forceY
  block.rotationSpeed = (Math.random() - .5) * 5
  const color = materialColor[block.material]
  for (let index = 0; index < 5; index++) {
    state.debris.push({
      x: block.x + (Math.random() - .5) * block.width,
      y: block.y + (Math.random() - .5) * block.height,
      velocityX: forceX * (.4 + Math.random() * .45) + (Math.random() - .5) * 100,
      velocityY: forceY * (.35 + Math.random() * .4) - Math.random() * 80,
      size: Math.max(3, block.width * (.05 + Math.random() * .08)),
      color,
      life: .7 + Math.random() * .65,
    })
  }
}

function prepareRound(state: RubbleState, width: number, height: number) {
  const ground = height * .8
  const scale = Math.min(width / 390, height / 844)
  const rows = towerRows(state.round)
  state.phase = 'aiming'
  state.anchorX = width * .22
  state.anchorY = height * .69
  state.velocityX = 0
  state.velocityY = 0
  state.dragX = -Math.min(width * .16, 66)
  state.dragY = Math.min(height * .055, 42)
  state.pointerId = -1
  // Keep the objective clear of the persistent social rail on narrow phones.
  state.targetX = width * (.66 + Math.random() * .07)
  state.targetY = ground - (rows + .72) * 32 * scale
  state.targetRadius = Math.max(width * .045, width * (.075 - state.round * .0022))
  state.wind = state.round < 3 ? 0 : (Math.random() - .5) * Math.min(width * .22, state.round * 9)
  const blockWidth = 44 * scale
  const blockHeight = 29 * scale
  const towerBase = ground - 4 * scale
  const columns = state.round > 4 ? 3 : 2
  state.blocks = []
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const material = chooseMaterial(state.round, row, column)
      const maxHp = material === 'armor' ? 2 : 1
      state.blocks.push({
        x: state.targetX + (column - (columns - 1) / 2) * (blockWidth + 3 * scale),
        y: towerBase - (row + .5) * (blockHeight + 3 * scale),
        width: blockWidth,
        height: blockHeight,
        material,
        hp: maxHp,
        maxHp,
        falling: false,
        velocityX: 0,
        velocityY: 0,
        rotation: ((row + column) % 2 ? 1 : -1) * .018,
        rotationSpeed: 0,
        lastHitAt: 0,
      })
    }
  }
  state.debris = []
  state.blocksDestroyed = 0
  state.shake = 0
  state.shotTime = 0
  state.bounces = 0
  state.transitionAt = 0
  state.message = state.round === 1 ? 'PULL + RELEASE' : `WAVE ${String(state.round).padStart(2, '0')}`
  state.ballX = state.anchorX + state.dragX
  state.ballY = state.anchorY + state.dragY
}

export default function RubbleRush({
  isActive,
  onScore,
  onGameOver,
  reducedMotion,
  soundEnabled,
}: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<RubbleState>({ ...initialState })

  const finishRun = useCallback(() => {
    const state = stateRef.current
    if (state.phase === 'failed') return
    state.phase = 'failed'
    state.message = 'SHOT SPENT!'
    state.flash = 1
    hapticError()
    playSound('fail', soundEnabled)
    onGameOver(state.score)
  }, [onGameOver, soundEnabled])

  const draw = useCallback((context: CanvasRenderingContext2D, width: number, height: number) => {
    const state = stateRef.current
    const ground = height * .8
    const scale = Math.min(width / 390, height / 844)

    const sky = context.createLinearGradient(0, 0, 0, height)
    sky.addColorStop(0, '#5fd2d0')
    sky.addColorStop(.54, '#b5e5c8')
    sky.addColorStop(.55, '#f6c85f')
    sky.addColorStop(1, '#e87238')
    context.fillStyle = sky
    context.fillRect(0, 0, width, height)

    context.fillStyle = 'rgba(255,245,220,.62)'
    for (let index = 0; index < 5; index++) {
      const x = width * (.04 + index * .25)
      const y = height * (.19 + (index % 2) * .07)
      context.fillRect(x, y, width * .16, height * .025)
      context.fillRect(x + width * .04, y - height * .018, width * .08, height * .02)
    }

    context.fillStyle = '#d99a43'
    context.fillRect(0, ground, width, height - ground)
    context.strokeStyle = INK
    context.lineWidth = 5 * scale
    context.beginPath()
    context.moveTo(0, ground)
    context.lineTo(width, ground)
    context.stroke()
    context.fillStyle = 'rgba(18,18,18,.16)'
    for (let x = -20; x < width; x += 46 * scale) {
      context.fillRect(x, ground + 22 * scale, 28 * scale, 5 * scale)
    }

    context.save()
    const shake = reducedMotion ? 0 : state.shake * scale
    context.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake)

    for (const block of state.blocks) {
      context.save()
      context.translate(block.x, block.y)
      context.rotate(block.rotation)
      context.fillStyle = materialColor[block.material]
      context.strokeStyle = INK
      context.lineWidth = 4 * scale
      context.fillRect(-block.width / 2, -block.height / 2, block.width, block.height)
      context.strokeRect(-block.width / 2, -block.height / 2, block.width, block.height)
      context.fillStyle = block.material === 'armor' ? LIME : block.material === 'glass' ? CREAM : ORANGE
      context.fillRect(-block.width * .22, -3 * scale, block.width * .44, 6 * scale)
      if (block.material === 'bomb') {
        context.fillStyle = INK
        context.beginPath()
        context.arc(0, 0, block.height * .24, 0, Math.PI * 2)
        context.fill()
        context.strokeStyle = LIME
        context.lineWidth = 2 * scale
        context.beginPath()
        context.moveTo(block.height * .15, -block.height * .17)
        context.lineTo(block.height * .29, -block.height * .34)
        context.stroke()
      }
      if (block.hp < block.maxHp) {
        context.strokeStyle = CREAM
        context.lineWidth = 2 * scale
        context.beginPath()
        context.moveTo(-block.width * .28, -block.height * .35)
        context.lineTo(0, 0)
        context.lineTo(block.width * .24, block.height * .34)
        context.stroke()
      }
      context.restore()
    }

    for (const piece of state.debris) {
      context.globalAlpha = Math.min(1, piece.life * 2)
      context.fillStyle = piece.color
      context.strokeStyle = INK
      context.lineWidth = 1.5 * scale
      context.fillRect(piece.x - piece.size / 2, piece.y - piece.size / 2, piece.size, piece.size)
      context.strokeRect(piece.x - piece.size / 2, piece.y - piece.size / 2, piece.size, piece.size)
    }
    context.globalAlpha = 1

    context.save()
    context.translate(state.targetX, state.targetY)
    if (state.phase === 'success') context.rotate((performance.now() / 65) % (Math.PI * 2))
    context.fillStyle = LIME
    context.strokeStyle = INK
    context.lineWidth = 5 * scale
    context.beginPath()
    for (let point = 0; point < 12; point++) {
      const angle = point / 12 * Math.PI * 2
      const radius = state.targetRadius * (point % 2 ? .72 : 1)
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      if (point === 0) context.moveTo(x, y)
      else context.lineTo(x, y)
    }
    context.closePath()
    context.fill()
    context.stroke()
    context.fillStyle = INK
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.font = `900 ${Math.max(8, state.targetRadius * .45)}px "Archivo Black", sans-serif`
    context.fillText('CORE', 0, 1 * scale)
    context.restore()

    context.strokeStyle = INK
    context.lineWidth = 10 * scale
    context.lineCap = 'round'
    context.beginPath()
    context.moveTo(state.anchorX - 18 * scale, state.anchorY + 43 * scale)
    context.lineTo(state.anchorX - 11 * scale, state.anchorY - 22 * scale)
    context.moveTo(state.anchorX + 18 * scale, state.anchorY + 43 * scale)
    context.lineTo(state.anchorX + 11 * scale, state.anchorY - 22 * scale)
    context.stroke()
    context.strokeStyle = ORANGE
    context.lineWidth = 5 * scale
    context.beginPath()
    context.moveTo(state.anchorX - 11 * scale, state.anchorY - 18 * scale)
    context.lineTo(state.ballX, state.ballY)
    context.lineTo(state.anchorX + 11 * scale, state.anchorY - 18 * scale)
    context.stroke()

    if (state.phase === 'aiming') {
      const velocityX = -state.dragX * 6.4
      const velocityY = -state.dragY * 6.4
      context.fillStyle = 'rgba(255,245,220,.72)'
      for (let step = 1; step <= 7; step++) {
        const time = step * .105
        const x = state.anchorX + velocityX * time + state.wind * time * time / 2
        const y = state.anchorY + velocityY * time + height * .72 * time * time / 2
        context.beginPath()
        context.arc(x, y, Math.max(2, (8 - step) * scale), 0, Math.PI * 2)
        context.fill()
      }
    }

    context.save()
    context.translate(state.ballX, state.ballY)
    context.rotate((state.ballX + state.ballY) / 55)
    context.fillStyle = ORANGE
    context.strokeStyle = INK
    context.lineWidth = 5 * scale
    context.beginPath()
    for (let point = 0; point < 16; point++) {
      const angle = point / 16 * Math.PI * 2
      const radius = (point % 2 ? 14 : 20) * scale
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      if (point === 0) context.moveTo(x, y)
      else context.lineTo(x, y)
    }
    context.closePath()
    context.fill()
    context.stroke()
    context.fillStyle = CREAM
    context.beginPath()
    context.arc(0, 0, 6 * scale, 0, Math.PI * 2)
    context.fill()
    context.restore()
    context.restore()

    context.textAlign = 'center'
    context.fillStyle = CREAM
    context.strokeStyle = INK
    context.lineWidth = 7 * scale
    const messageSize = state.message.length > 17
      ? Math.max(18, height * .026)
      : Math.max(25, height * .039)
    context.font = `900 ${messageSize}px "Archivo Black", sans-serif`
    context.strokeText(state.message, width / 2, height * .27)
    context.fillText(state.message, width / 2, height * .27)
    context.font = `700 ${Math.max(9, height * .013)}px "DM Mono", monospace`
    context.fillStyle = INK
    const windLabel = Math.abs(state.wind) < 1 ? 'NO WIND' : `WIND ${state.wind > 0 ? '→' : '←'} ${Math.ceil(Math.abs(state.wind) / 10)}`
    context.fillText(`${windLabel} · ONE SHOT`, width / 2, height * .305)

    if (state.flash > 0) {
      context.globalAlpha = state.flash * .34
      context.fillStyle = state.phase === 'success' ? LIME : ORANGE
      context.fillRect(0, 0, width, height)
      context.globalAlpha = 1
    }
  }, [reducedMotion])

  const loop = useCallback((time: number) => {
    const canvas = canvasRef.current
    const state = stateRef.current
    if (!canvas || !state.running) return
    const context = canvas.getContext('2d')
    if (!context) return
    const dt = state.lastTime ? Math.min((time - state.lastTime) / 1000, .04) : .016
    state.lastTime = time
    state.flash = Math.max(0, state.flash - dt * 4)
    state.shake = Math.max(0, state.shake - dt * 24)

    const ground = canvas.height * .8
    for (const block of state.blocks) {
      if (!block.falling) continue
      block.velocityY += canvas.height * .74 * dt
      block.x += block.velocityX * dt
      block.y += block.velocityY * dt
      block.rotation += block.rotationSpeed * dt
      if (block.y + block.height / 2 >= ground) {
        block.y = ground - block.height / 2
        block.velocityY *= -.24
        block.velocityX *= .72
        block.rotationSpeed *= .7
      }
    }
    for (const piece of state.debris) {
      piece.velocityY += canvas.height * .82 * dt
      piece.x += piece.velocityX * dt
      piece.y += piece.velocityY * dt
      piece.life -= dt
    }
    state.debris = state.debris.filter(piece => piece.life > 0)

    if (state.phase === 'flying') {
      state.shotTime += dt
      state.velocityX += state.wind * dt
      state.velocityY += canvas.height * .72 * dt
      state.ballX += state.velocityX * dt
      state.ballY += state.velocityY * dt

      if (Math.hypot(state.ballX - state.targetX, state.ballY - state.targetY) <= state.targetRadius + canvas.width * .05) {
        const standingBlocks = state.blocks.filter(block => !block.falling)
        const collapseBonus = standingBlocks.length * 8
        const points = 80 + state.round * 20 + collapseBonus + Math.max(0, Math.round((4.5 - state.shotTime) * 12))
        for (const block of standingBlocks) {
          const direction = Math.sign(block.x - state.targetX) || (Math.random() > .5 ? 1 : -1)
          scatterBlock(state, block, direction * (90 + Math.random() * 130), -130 - Math.random() * 130)
        }
        state.score += points
        state.blocksDestroyed += standingBlocks.length
        state.round += 1
        state.phase = 'success'
        state.message = `PERFECT COLLAPSE +${points}`
        state.transitionAt = time + (reducedMotion ? 300 : 820)
        state.flash = 1
        state.shake = 18
        onScore(state.score)
        hapticLight()
        playSound(state.round % 5 === 0 ? 'milestone' : 'success', soundEnabled)
      } else {
        const ballRadius = canvas.width * .045
        for (const block of state.blocks) {
          if (block.falling || time - block.lastHitAt < 180) continue
          const closestX = Math.max(block.x - block.width / 2, Math.min(state.ballX, block.x + block.width / 2))
          const closestY = Math.max(block.y - block.height / 2, Math.min(state.ballY, block.y + block.height / 2))
          const deltaX = state.ballX - closestX
          const deltaY = state.ballY - closestY
          if (deltaX * deltaX + deltaY * deltaY > ballRadius * ballRadius) continue
          block.lastHitAt = time
          block.hp -= 1
          state.shake = block.material === 'armor' ? 11 : 15
          if (block.hp <= 0) {
            let bonus = blockBonus(block.material)
            scatterBlock(state, block, state.velocityX * .34, state.velocityY * .18 - 70)
            state.blocksDestroyed += 1
            if (block.material === 'bomb') {
              for (const nearby of state.blocks) {
                if (nearby === block || nearby.falling) continue
                if (Math.hypot(nearby.x - block.x, nearby.y - block.y) > block.width * 2.35) continue
                nearby.hp = 0
                const direction = Math.sign(nearby.x - block.x) || (Math.random() > .5 ? 1 : -1)
                scatterBlock(state, nearby, direction * (140 + Math.random() * 110), -150 - Math.random() * 100)
                state.blocksDestroyed += 1
                bonus += blockBonus(nearby.material)
              }
              state.flash = 1
              state.shake = 22
            }
            state.score += bonus
            state.message = block.material === 'bomb'
              ? `CHAIN BLAST +${bonus}`
              : `${block.material.toUpperCase()} BREAK +${bonus}`
            onScore(state.score)
            playSound('success', soundEnabled)
          } else {
            state.message = 'ARMORED! HIT AGAIN'
            playSound('tap', soundEnabled)
          }
          if (Math.abs(deltaX) > Math.abs(deltaY)) state.velocityX *= -.42
          else state.velocityY *= -.42
          state.velocityX *= .78
          state.velocityY *= .78
          break
        }
        if (state.ballY + ballRadius >= ground && state.velocityY > 0) {
          state.ballY = ground - ballRadius
          state.velocityY *= -.34
          state.velocityX *= .68
          state.bounces += 1
        }
        const spent = state.shotTime > 5
          || state.ballX > canvas.width + ballRadius
          || state.ballX < -ballRadius
          || state.ballY < -canvas.height * .25
          || (state.bounces > 1 && Math.hypot(state.velocityX, state.velocityY) < canvas.width * .28)
        if (spent) finishRun()
      }
    } else if (state.phase === 'success' && time >= state.transitionAt) {
      prepareRound(state, canvas.width, canvas.height)
    }

    draw(context, canvas.width, canvas.height)
    state.rafId = requestAnimationFrame(loop)
  }, [draw, finishRun, onScore, reducedMotion, soundEnabled])

  const pointerPoint = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) * canvas.width / rect.width,
      y: (event.clientY - rect.top) * canvas.height / rect.height,
    }
  }, [])

  const handlePointerDown = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    const state = stateRef.current
    if (!state.running || state.phase !== 'aiming') return
    event.currentTarget.setPointerCapture(event.pointerId)
    state.pointerId = event.pointerId
    hapticLight()
  }, [])

  const handlePointerMove = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    const state = stateRef.current
    if (state.pointerId !== event.pointerId || state.phase !== 'aiming') return
    const point = pointerPoint(event)
    const canvas = canvasRef.current
    if (!point || !canvas) return
    const maxPull = Math.min(canvas.width * .23, canvas.height * .12)
    const rawX = Math.min(-12, point.x - state.anchorX)
    const rawY = Math.max(8, point.y - state.anchorY)
    const distance = Math.hypot(rawX, rawY)
    const scale = distance > maxPull ? maxPull / distance : 1
    state.dragX = rawX * scale
    state.dragY = rawY * scale
    state.ballX = state.anchorX + state.dragX
    state.ballY = state.anchorY + state.dragY
  }, [pointerPoint])

  const launch = useCallback(() => {
    const state = stateRef.current
    if (!state.running || state.phase !== 'aiming') return
    if (Math.hypot(state.dragX, state.dragY) < 24) {
      state.dragX = -58
      state.dragY = 38
    }
    state.ballX = state.anchorX
    state.ballY = state.anchorY
    state.velocityX = -state.dragX * 6.4
    state.velocityY = -state.dragY * 6.4
    state.pointerId = -1
    state.phase = 'flying'
    state.message = 'RUBBLE RUSH!'
    playSound('tap', soundEnabled)
  }, [soundEnabled])

  const handlePointerUp = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    if (stateRef.current.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    launch()
  }, [launch])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(canvas.offsetWidth * ratio)
      canvas.height = Math.round(canvas.offsetHeight * ratio)
      const state = stateRef.current
      if (state.phase === 'aiming' || !state.running) prepareRound(state, canvas.width, canvas.height)
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const state = stateRef.current
    const canvas = canvasRef.current
    if (isActive && canvas) {
      Object.assign(state, { ...initialState, running: true })
      prepareRound(state, canvas.width, canvas.height)
      state.lastTime = 0
      state.rafId = requestAnimationFrame(loop)
    } else {
      state.running = false
      state.pointerId = -1
      cancelAnimationFrame(state.rafId)
    }
    return () => {
      state.running = false
      state.pointerId = -1
      cancelAnimationFrame(state.rafId)
    }
  }, [isActive, loop])

  return (
    <div className="rubble-game">
      <canvas ref={canvasRef} className="game-canvas" aria-hidden="true" />
      <button
        className="rubble-game__launcher"
        aria-label="Pull back and release the wrecking puck"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          stateRef.current.pointerId = -1
        }}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            launch()
          }
        }}
      />
    </div>
  )
}
