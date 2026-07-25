import express from 'express'
import cors from 'cors'
import path from 'path'
import scoresRouter from './routes/scores'
import runsRouter from './routes/runs'
import { getScoreService, getScoreStorageMode } from './services/scoreService'

const app = express()

// In production the Express server owns port 5000 and serves both the API
// and the pre-built Vite frontend.  In dev, Vite runs on 5000 and proxies
// /api to this server on 3001, so we default to 3001 there.
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

// API routes
app.use('/api/scores', scoresRouter)
app.use('/api/leaderboard', scoresRouter)
app.use('/api/runs', runsRouter)

// Health check (used by Replit deployment health checks)
app.get('/api/health', async (_req, res) => {
  await getScoreService()
  const storage = getScoreStorageMode()
  res.json({
    ok: true,
    storage,
    persistent: storage === 'postgres',
    authReady: Boolean(process.env.CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY),
    ts: Date.now(),
  })
})

// Serve the pre-built Vite frontend in production
if (isProduction) {
  const clientPath = path.join(__dirname, '../client')
  app.use(express.static(clientPath, {
    maxAge: '1d',
    etag: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache')
    },
  }))
  // SPA fallback — send index.html for any non-API route
  app.get('*', (_req, res) => res.sendFile(path.join(clientPath, 'index.html')))
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] ${isProduction ? 'production' : 'development'} — listening on http://0.0.0.0:${PORT}`)
})

export default app
