import { GameMeta } from '../types/game'

export const DAILY_GAUNTLET_SLUG = 'daily-gauntlet'
export const DAILY_GAUNTLET_LENGTH = 3

const SCORE_TARGETS: Record<string, number> = {
  'orbit-lock': 300,
  'lane-shift': 24,
  'echo-grid': 600,
  'gravity-flip': 24,
  'micro-mayhem': 900,
  'cannon-dash': 600,
  'rail-blaster': 900,
  'turbo-serve': 900,
  'reel-trouble': 1200,
  'pin-drop': 1200,
}

export function getUtcDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

export function formatGauntletDate(dayKey: string): string {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${dayKey}T12:00:00Z`)).toUpperCase()
}

function hashDay(dayKey: string): number {
  let hash = 2166136261
  for (const character of dayKey) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function seededRandom(seed: number): () => number {
  let state = seed || 1
  return () => {
    state = Math.imul(state ^ (state >>> 15), 1 | state)
    state ^= state + Math.imul(state ^ (state >>> 7), 61 | state)
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296
  }
}

export function getDailyGauntlet(games: GameMeta[], dayKey = getUtcDayKey()): GameMeta[] {
  const result = [...games]
  const random = seededRandom(hashDay(dayKey))
  for (let index = result.length - 1; index > 0; index--) {
    const target = Math.floor(random() * (index + 1))
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result.slice(0, Math.min(DAILY_GAUNTLET_LENGTH, result.length))
}

export function toGauntletPoints(gameSlug: string, score: number): number {
  const target = SCORE_TARGETS[gameSlug] ?? 500
  return Math.min(1000, Math.max(0, Math.round(score / target * 1000)))
}
