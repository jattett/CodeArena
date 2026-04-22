import express from 'express'
import cors from 'cors'
import {
  handleCallback,
  handleLogin,
  handleLogout,
  handleStatus,
} from './auth.js'
import { handleChatProxy } from './proxy.js'
import { handlePistonRun } from './pistonProxy.js'
import {
  detectToolchains,
  getToolchainStatus,
  handleLocalRun,
} from './localExec.js'
import { CODEX_PROXY_URL, getStatus, startCodexProxy, stopCodexProxy } from './codexProxy.js'
import { loadTokens } from './tokens.js'

const PORT = 1455

const app = express()
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true)
      try {
        const u = new URL(origin)
        const ok = u.hostname === 'localhost' || u.hostname === '127.0.0.1'
        return cb(null, ok)
      } catch {
        return cb(null, false)
      }
    },
    credentials: false,
  }),
)
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    version: '0.4.0',
    codexProxy: getStatus(),
    toolchain: getToolchainStatus(),
  })
})

app.get('/auth/login', handleLogin)
app.get('/auth/callback', handleCallback)
app.get('/api/auth/status', handleStatus)
app.post('/api/auth/logout', handleLogout)
app.post('/api/openai/chat', handleChatProxy)
app.post('/api/run/local', handleLocalRun)
app.post('/api/run/piston', handlePistonRun)

const server = app.listen(PORT, async () => {
  const banner = `
  ┌─────────────────────────────────────────────┐
  │  CodeArena Auth Server                      │
  │  Listening on http://localhost:${PORT}         │
  │                                             │
  │  OAuth callback: /auth/callback             │
  │  Proxy:          POST /api/openai/chat      │
  │  Local runner:   POST /api/run/local        │
  │  Piston proxy:   POST /api/run/piston       │
  │  Codex upstream: ${CODEX_PROXY_URL}   │
  └─────────────────────────────────────────────┘
`
  console.log(banner)

  const tc = await detectToolchains()
  console.log(
    `[startup] local toolchains: java=${tc.java.available ? '✓' : '✗'} ${
      tc.java.path ?? ''
    } · dotnet=${tc.csharp.available ? '✓' : '✗'} ${tc.csharp.path ?? ''}`,
  )

  const tokens = await loadTokens()
  if (tokens) {
    console.log('[startup] found existing tokens, starting openai-oauth subprocess...')
    void startCodexProxy().catch((e) =>
      console.error('[startup] codex-proxy start failed:', e),
    )
  }
})

const shutdown = async (sig: string) => {
  console.log(`\n[auth] ${sig} received, shutting down...`)
  await stopCodexProxy()
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 3000).unref()
}
process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))
