import crypto from 'node:crypto'
import type { Request, Response } from 'express'
import {
  clearTokens,
  extractChatGPTAccountId,
  loadTokens,
  saveTokens,
  type StoredTokens,
} from './tokens.js'
import { restartCodexProxy, stopCodexProxy } from './codexProxy.js'

/**
 * OpenAI Codex CLI 의 공개 PKCE OAuth 파라미터.
 * (Codex CLI / 여러 오픈소스 클론에서 공개된 값)
 */
export const OAUTH_CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann'
export const OAUTH_AUTHORIZE_URL = 'https://auth.openai.com/oauth/authorize'
export const OAUTH_TOKEN_URL = 'https://auth.openai.com/oauth/token'
export const OAUTH_REDIRECT_URI = 'http://localhost:1455/auth/callback'
export const OAUTH_SCOPES = 'openid profile email offline_access'

interface PendingAuth {
  state: string
  verifier: string
  createdAt: number
}

/** 진행 중인 OAuth 요청을 state 로 추적 (10분 유효) */
const pending = new Map<string, PendingAuth>()

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function generateVerifier(): string {
  return b64url(crypto.randomBytes(32))
}

function challengeFromVerifier(verifier: string): string {
  return b64url(crypto.createHash('sha256').update(verifier).digest())
}

function generateState(): string {
  return crypto.randomBytes(16).toString('hex')
}

function cleanupPending() {
  const cutoff = Date.now() - 10 * 60 * 1000
  for (const [k, v] of pending) if (v.createdAt < cutoff) pending.delete(k)
}

/* ---------- HTTP Handlers ---------- */

/**
 * GET /auth/login
 * 새 PKCE 파라미터를 만들고 OpenAI authorize URL 을 반환합니다.
 * 프론트엔드는 이 URL 을 새 창/탭으로 열면 됩니다.
 */
export function handleLogin(_req: Request, res: Response) {
  cleanupPending()
  const state = generateState()
  const verifier = generateVerifier()
  pending.set(state, { state, verifier, createdAt: Date.now() })

  const url = new URL(OAUTH_AUTHORIZE_URL)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', OAUTH_CLIENT_ID)
  url.searchParams.set('redirect_uri', OAUTH_REDIRECT_URI)
  url.searchParams.set('scope', OAUTH_SCOPES)
  url.searchParams.set('code_challenge', challengeFromVerifier(verifier))
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('state', state)
  url.searchParams.set('id_token_add_organizations', 'true')
  url.searchParams.set('codex_cli_simplified_flow', 'true')
  url.searchParams.set('originator', 'codearena')

  res.json({ authorizeUrl: url.toString(), state })
}

/**
 * GET /auth/callback?code=...&state=...
 * OpenAI 로부터 리다이렉트된 요청. code 를 token 으로 교환한 뒤,
 * 브라우저 탭을 자동으로 닫는 간단한 HTML 로 응답합니다.
 */
export async function handleCallback(req: Request, res: Response) {
  const code = typeof req.query.code === 'string' ? req.query.code : ''
  const state = typeof req.query.state === 'string' ? req.query.state : ''
  const error = typeof req.query.error === 'string' ? req.query.error : ''

  if (error) {
    return res.status(400).send(renderPage('인증 실패', `OpenAI가 오류를 반환했습니다: ${error}`, false))
  }
  if (!code || !state) {
    return res.status(400).send(renderPage('잘못된 요청', 'code 또는 state 파라미터가 없습니다.', false))
  }

  const entry = pending.get(state)
  if (!entry) {
    return res
      .status(400)
      .send(renderPage('세션 만료', '인증 세션을 찾을 수 없습니다. 다시 로그인해주세요.', false))
  }
  pending.delete(state)

  try {
    const tokens = await exchangeCodeForTokens(code, entry.verifier)
    await saveTokens(tokens)
    // 새 토큰으로 codex-proxy 서브프로세스 재기동 (백그라운드)
    void restartCodexProxy().catch((e) => console.error('[auth] codex-proxy restart failed:', e))
    res.send(renderPage('로그인 성공', 'CodeArena로 돌아가세요. 이 창은 닫으셔도 됩니다.', true))
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    res.status(500).send(renderPage('토큰 교환 실패', msg, false))
  }
}

/**
 * GET /api/auth/status
 */
export async function handleStatus(_req: Request, res: Response) {
  const t = await loadTokens()
  if (!t) {
    return res.json({ loggedIn: false })
  }
  const expiresAt = t.obtainedAt + t.expiresIn * 1000
  res.json({
    loggedIn: true,
    accountId: t.accountId,
    expiresAt,
    tokenType: t.tokenType,
  })
}

/**
 * POST /api/auth/logout
 */
export async function handleLogout(_req: Request, res: Response) {
  await clearTokens()
  void stopCodexProxy().catch(() => void 0)
  res.json({ ok: true })
}

/* ---------- Token Exchange / Refresh ---------- */

interface OpenAITokenResponse {
  access_token: string
  refresh_token?: string
  id_token?: string
  token_type: string
  expires_in: number
  error?: string
  error_description?: string
}

async function exchangeCodeForTokens(code: string, verifier: string): Promise<StoredTokens> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: OAUTH_REDIRECT_URI,
    client_id: OAUTH_CLIENT_ID,
    code_verifier: verifier,
  })
  const resp = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = (await resp.json()) as OpenAITokenResponse
  if (!resp.ok) {
    throw new Error(
      `토큰 교환 실패 (${resp.status}): ${data.error_description || data.error || 'unknown'}`,
    )
  }
  return toStored(data)
}

export async function refreshTokens(refreshToken: string): Promise<StoredTokens> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: OAUTH_CLIENT_ID,
    scope: OAUTH_SCOPES,
  })
  const resp = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = (await resp.json()) as OpenAITokenResponse
  if (!resp.ok) {
    throw new Error(
      `토큰 갱신 실패 (${resp.status}): ${data.error_description || data.error || 'unknown'}`,
    )
  }
  return toStored({
    ...data,
    refresh_token: data.refresh_token ?? refreshToken,
  })
}

function toStored(r: OpenAITokenResponse): StoredTokens {
  return {
    accessToken: r.access_token,
    refreshToken: r.refresh_token ?? null,
    idToken: r.id_token ?? null,
    accountId: extractChatGPTAccountId(r.id_token ?? null),
    obtainedAt: Date.now(),
    expiresIn: r.expires_in,
    tokenType: r.token_type,
  }
}

/* ---------- Callback HTML ---------- */

function renderPage(title: string, message: string, success: boolean): string {
  const color = success ? '#22c55e' : '#ef4444'
  const icon = success ? '✓' : '✕'
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>${title} · CodeArena</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, system-ui, "Apple SD Gothic Neo", "Segoe UI", sans-serif;
      background: #0f1115;
      color: #e6e8ef;
    }
    .card {
      text-align: center;
      padding: 44px 56px;
      background: #171a21;
      border: 1px solid #2a2f3d;
      border-radius: 14px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.4);
    }
    .icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: ${color}20;
      color: ${color};
      font-size: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
    }
    h1 { margin: 0 0 8px; font-size: 22px; }
    p { margin: 0; color: #9aa3b2; }
    .hint { margin-top: 22px; font-size: 12px; color: #6a7284; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    ${success ? '<p class="hint">이 창은 3초 뒤 자동으로 닫힙니다.</p>' : ''}
  </div>
  ${success ? '<script>setTimeout(() => window.close(), 3000)</script>' : ''}
</body>
</html>`
}
