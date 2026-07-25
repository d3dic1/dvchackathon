import express from 'express'
import cors from 'cors'
import path from 'path'
import scoresRouter from './routes/scores'

const app = express()

// In production the Express server owns port 5000 and serves both the API
// and the pre-built Vite frontend.  In dev, Vite runs on 5000 and proxies
// /api to this server on 3001, so we default to 3001 there.
const isProduction = process.env.NODE_ENV === 'production'
const PORT = parseInt(process.env.PORT ?? (isProduction ? '5000' : '3001'), 10)

app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '64kb' }))

// API routes
app.use('/api/scores', scoresRouter)
app.use('/api/leaderboard', scoresRouter)

// Health check (used by Replit deployment health checks)
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }))

// Serve the pre-built Vite frontend in production
if (isProduction) {
  const clientPath = path.join(__dirname, '../client')
  app.use(express.static(clientPath, { maxAge: '1d', etag: true }))
  // SPA fallback — send index.html for any non-API route
  app.get('*', (_req, res) => res.sendFile(path.join(clientPath, 'index.html')))
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] ${isProduction ? 'production' : 'development'} — listening on http://0.0.0.0:${PORT}`)
})

export default app
