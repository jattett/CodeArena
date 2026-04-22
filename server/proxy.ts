import type { Request, Response } from 'express'
import { getCodexProxyUrl, isRunning, startCodexProxy } from './codexProxy.js'
import { loadTokens } from './tokens.js'

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions'

/**
 * POST /api/openai/chat
 *
 * body:
 *   {
 *     mode: 'apikey' | 'oauth',
 *     apiKey?: string,
 *     payload: <OpenAI Chat Completions 요청 본문>
 *   }
 *
 * - apikey 모드: 사용자의 OpenAI API 키로 api.openai.com 호출
 * - oauth  모드: openai-oauth 로컬 프록시(localhost:10531) 로 포워딩
 *                → 실제로는 chatgpt.com/backend-api/codex 가 뒤에서 호출됨
 */
export async function handleChatProxy(req: Request, res: Response) {
  const body = req.body as {
    mode?: 'apikey' | 'oauth'
    apiKey?: string
    payload?: unknown
  }
  const mode = body.mode ?? 'oauth'
  const payload = body.payload

  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ error: { message: '유효한 Chat Completions payload 가 필요합니다.' } })
  }

  if (mode === 'apikey') {
    const key = body.apiKey ?? ''
    if (!key) {
      return res.status(400).json({
        error: { message: 'API 키 모드인데 apiKey 필드가 비어있습니다.' },
      })
    }
    return forwardTo(res, OPENAI_CHAT_URL, `Bearer ${key}`, payload)
  }

  const t = await loadTokens()
  if (!t) {
    return res.status(401).json({
      error: {
        message:
          'ChatGPT 로그인 상태가 아닙니다. 설정에서 "Sign in with ChatGPT" 를 눌러 로그인해주세요.',
      },
    })
  }

  // openai-oauth 서브프로세스가 내려가 있으면 자동으로 기동
  if (!isRunning()) {
    const ok = await startCodexProxy()
    if (!ok) {
      return res.status(503).json({
        error: {
          message:
            'openai-oauth 로컬 프록시를 기동하지 못했습니다. 서버 로그(`[codex-proxy]`)를 확인하거나, 설정에서 API 키 모드로 전환해주세요.',
        },
      })
    }
  }

  return forwardTo(res, `${getCodexProxyUrl()}/v1/chat/completions`, null, payload, (status, text) => {
    if (status === 401) return '토큰이 만료됐거나 무효합니다. 로그아웃 후 다시 로그인해주세요.'
    if (status === 403) return 'ChatGPT 계정에 Codex 접근 권한이 없습니다 (Plus/Pro 이상 구독 필요).'
    if (status === 429) return 'Codex 5시간/주간 한도에 도달했습니다. 잠시 후 다시 시도해주세요.'
    if (status === 400)
      return `요청 포맷이 맞지 않습니다. 상세: ${text.slice(0, 200)}`
    return null
  })
}

type HintFn = (status: number, body: string) => string | null

async function forwardTo(
  res: Response,
  url: string,
  authHeader: string | null,
  payload: unknown,
  hint?: HintFn,
) {
  let upstream: globalThis.Response
  try {
    upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return res.status(502).json({ error: { message: `업스트림 호출 실패: ${msg}` } })
  }

  const text = await upstream.text()
  if (!upstream.ok) {
    const extra = hint?.(upstream.status, text)
    let errorMessage: string | undefined
    try {
      const j = JSON.parse(text) as { error?: { message?: string } }
      errorMessage = j.error?.message
    } catch {
      /* ignore */
    }
    return res.status(upstream.status).json({
      error: {
        message:
          `${errorMessage ?? `HTTP ${upstream.status}`}` + (extra ? `\n힌트: ${extra}` : ''),
      },
    })
  }

  res.status(upstream.status)
  res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json')
  res.send(text)
}
