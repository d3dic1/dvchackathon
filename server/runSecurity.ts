import { createHmac, randomUUID, timingSafeEqual } from 'crypto'

interface RunPayload {
  version: 1
  gameSlug: string
  deviceId: string
  startedAt: number
  runId: string
}

function secret() {
  return process.env.SESSION_SECRET || process.env.REPL_ID || 'flickcade-local-development'
}

function sign(payload: string) {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

export function createRunToken(gameSlug: string, deviceId: string) {
  const run: RunPayload = {
    version: 1,
    gameSlug,
    deviceId,
    startedAt: Date.now(),
    runId: randomUUID(),
  }
  const payload = Buffer.from(JSON.stringify(run)).toString('base64url')
  return { runToken: `${payload}.${sign(payload)}`, startedAt: run.startedAt }
}

export function verifyRunToken(token: string, gameSlug: string, deviceId: string) {
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null
  const expected = sign(payload)
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null

  try {
    const run = JSON.parse(Buffer.from(payload, 'base64url').toString()) as RunPayload
    const elapsed = Date.now() - run.startedAt
    if (
      run.version !== 1 ||
      run.gameSlug !== gameSlug ||
      run.deviceId !== deviceId ||
      elapsed < 250 ||
      elapsed > 2 * 60 * 60 * 1000
    ) return null
    return { runId: run.runId, elapsed }
  } catch {
    return null
  }
}
