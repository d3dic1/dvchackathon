import express from 'express'
import cors from 'cors'
import path from 'path'
import scoresRouter from './routes/scores'

const app = express()
const PORT = parseInt(process.env.PORT ?? '3001', 10)

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

// API routes
app.use('/api/scores', scoresRouter)
app.use('/api/leaderboard', scoresRouter)

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true }))

// Serve built frontend in production
if (process.env.NODE_ENV === 'production') {
  const clientPath = path.join(__dirname, '../client')
  app.use(express.static(clientPath))
  app.get('*', (_req, res) => res.sendFile(path.join(clientPath, 'index.html')))
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] Listening on http://0.0.0.0:${PORT}`)
})

export default app
