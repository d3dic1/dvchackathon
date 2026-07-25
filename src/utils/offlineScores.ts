const QUEUE_KEY = 'flickcade_pending_scores_v1'
const CHANGE_EVENT = 'flickcade:score-queue'

export interface PendingScore {
  gameSlug: string
  deviceId: string
  score: number
  runToken: string
  queuedAt: number
}

let flushPromise: Promise<number> | null = null

function readQueue(): PendingScore[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as PendingScore[]
  } catch {
    return []
  }
}

function writeQueue(queue: PendingScore[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: queue.length }))
}

export function pendingScoreCount() {
  return readQueue().length
}

export function queueScore(score: PendingScore) {
  const queue = readQueue()
  if (!queue.some(item => item.runToken === score.runToken)) queue.push(score)
  writeQueue(queue)
}

export function subscribeToScoreQueue(listener: (count: number) => void) {
  const handler = (event: Event) => listener((event as CustomEvent<number>).detail)
  window.addEventListener(CHANGE_EVENT, handler)
  return () => window.removeEventListener(CHANGE_EVENT, handler)
}

export function flushScoreQueue(getToken?: () => Promise<string | null>) {
  if (flushPromise) return flushPromise
  flushPromise = (async () => {
    const queue = readQueue()
    const remaining: PendingScore[] = []

    for (const item of queue) {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        const token = await getToken?.()
        if (token) headers.Authorization = `Bearer ${token}`
        const response = await fetch('/api/scores', {
          method: 'POST',
          headers,
          body: JSON.stringify(item),
        })
        if (response.status >= 500 || response.status === 429) remaining.push(item)
      } catch {
        remaining.push(item)
      }
    }

    writeQueue(remaining)
    return remaining.length
  })().finally(() => {
    flushPromise = null
  })
  return flushPromise
}
