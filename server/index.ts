import express from 'express'
import cors from 'cors'
import path from 'path'
import scoresRouter from './routes/scores'
import runsRouter from './routes/runs'
import authRouter from './routes/auth'
import { optionalClerkAuth } from './clerkAuth'
import { getScoreService, getScoreStorageMode } from './services/scoreService'

const app = express()

const isProduction = process.env.NODE_ENV === 'production'
const PORT = parseInt(process.env.PORT ?? (isProduction ? '5000' : '3001'), 10)

app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '64kb' }))
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  next()
})

// Decode Clerk Bearer token on every request — never blocks unauthenticated traffic
app.use(optionalClerkAuth)

// API routes
app.use('/api/scores',     scoresRouter)
app.use('/api/leaderboard', scoresRouter)
app.use('/api/runs',       runsRouter)
app.use('/api/auth',       authRouter)

// Health check
app.get('/api/health', async (_req, res) => {
  await getScoreService()
  const storage = getScoreStorageMode()
  res.json({
    ok: true,
    storage,
    persistent: storage === 'postgres',
    authReady: Boolean(process.env.CLERK_SECRET_KEY),
    ts: Date.now(),
  })
})

// Production: Express serves the pre-built Vite bundle on port 5000
if (isProduction) {
  const clientPath = path.join(__dirname, '../client')
  app.use(express.static(clientPath, {
    maxAge: '1d',
    etag: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache')
    },
  }))
  app.get('*', (_req, res) => res.sendFile(path.join(clientPath, 'index.html')))
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] ${isProduction ? 'production' : 'development'} — http://0.0.0.0:${PORT}`)
})

export default app
