import type { AuthMode, OpenAISettings } from '../types'

const SETTINGS_KEY = 'codearena.openai.v2'

/** API 키 모드 기본 모델 (일반 OpenAI API) */
export const DEFAULT_MODEL = 'gpt-4o-mini'
/** OAuth(ChatGPT) 모드 기본 모델 — Codex 플랜에서 제공되는 모델 */
export const DEFAULT_OAUTH_MODEL = 'gpt-5.4-mini'

export const SUGGESTED_MODELS: string[] = [
  'gpt-4o-mini',
  'gpt-4o',
  'gpt-4.1-mini',
  'gpt-4.1',
]
/** OAuth 모드 제안 모델 (실제 가용 목록은 계정/시점에 따라 변동) */
export const SUGGESTED_OAUTH_MODELS: string[] = [
  'gpt-5.4',
  'gpt-5.4-mini',
  'gpt-5.3-codex',
  'gpt-5.3-codex-spark',
  'gpt-5.2',
]

const EMPTY: OpenAISettings = {
  authMode: 'oauth',
  apiKey: '',
  model: DEFAULT_OAUTH_MODEL,
  pistonUrl: '',
}

function coerceAuthMode(v: unknown): AuthMode {
  return v === 'apikey' || v === 'oauth' ? v : 'oauth'
}

export function defaultModelFor(mode: AuthMode): string {
  return mode === 'oauth' ? DEFAULT_OAUTH_MODEL : DEFAULT_MODEL
}

export function loadSettings(): OpenAISettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...EMPTY }
    const parsed = JSON.parse(raw) as Partial<OpenAISettings>
    const authMode = coerceAuthMode(parsed.authMode)
    let model =
      typeof parsed.model === 'string' && parsed.model ? parsed.model : defaultModelFor(authMode)
    // OAuth 모드인데 저장된 값이 API 전용 모델이거나 구버전 오픈소스 기본값이면 보정
    if (
      authMode === 'oauth' &&
      (SUGGESTED_MODELS.includes(model) || model === 'gpt-5' || model === 'gpt-5-codex')
    ) {
      model = DEFAULT_OAUTH_MODEL
    }
    return {
      authMode,
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
      model,
      pistonUrl: typeof parsed.pistonUrl === 'string' ? parsed.pistonUrl : '',
    }
  } catch {
    return { ...EMPTY }
  }
}

export function saveSettings(s: OpenAISettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
  } catch {
    /* noop */
  }
}

export function clearSettings(): void {
  try {
    localStorage.removeItem(SETTINGS_KEY)
  } catch {
    /* noop */
  }
}

export function maskApiKey(k: string): string {
  if (!k) return ''
  if (k.length <= 10) return '*'.repeat(k.length)
  return `${k.slice(0, 5)}...${k.slice(-4)}`
}

/* ---------- Chat Completions (Structured Outputs) ---------- */

export interface JsonSchema {
  name: string
  strict?: boolean
  schema: Record<string, unknown>
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatRequestBody {
  model: string
  messages: ChatMessage[]
  response_format?: {
    type: 'json_schema'
    json_schema: JsonSchema
  }
  temperature?: number
}

interface ChatResponse {
  choices: Array<{
    message: { role: string; content: string; refusal?: string | null }
    finish_reason: string
  }>
  error?: { message: string; type?: string; code?: string }
}

export class OpenAIError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'OpenAIError'
    this.status = status
  }
}

/**
 * 로컬 백엔드 프록시를 통해 OpenAI Chat Completions 를 호출합니다.
 *
 * - settings.authMode === 'apikey'  → 백엔드가 사용자의 API 키로 업스트림 호출
 * - settings.authMode === 'oauth'   → 백엔드가 저장된 ChatGPT access_token 으로 업스트림 호출
 *
 * 어느 쪽이든 응답은 표준 OpenAI Chat Completions 포맷이며, Structured Outputs 로 강제된 JSON 을 파싱합니다.
 */
export async function chatJSON<T>({
  settings,
  system,
  user,
  schema,
  temperature = 0.7,
  signal,
}: {
  settings: import('../types').OpenAISettings
  system: string
  user: string
  schema: JsonSchema
  temperature?: number
  signal?: AbortSignal
}): Promise<T> {
  const payload: ChatRequestBody = {
    model: settings.model,
    temperature,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    response_format: { type: 'json_schema', json_schema: schema },
  }

  const requestBody = {
    mode: settings.authMode,
    apiKey: settings.authMode === 'apikey' ? settings.apiKey : undefined,
    payload,
  }

  if (settings.authMode === 'apikey' && !settings.apiKey) {
    throw new OpenAIError(
      401,
      'OpenAI API 키가 설정되지 않았습니다. 상단의 설정(⚙️)에서 키를 저장해주세요.',
    )
  }

  let resp: Response
  try {
    resp = await fetch('/api/openai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new OpenAIError(
      0,
      `백엔드 서버에 연결할 수 없습니다: ${msg}\n\n'npm run dev' 로 프론트+백엔드를 함께 실행했는지 확인해주세요.`,
    )
  }

  const text = await resp.text()
  let data: ChatResponse
  try {
    data = JSON.parse(text) as ChatResponse
  } catch {
    throw new OpenAIError(resp.status, `잘못된 응답: ${text.slice(0, 200)}`)
  }

  if (!resp.ok) {
    const msg = data.error?.message || `HTTP ${resp.status}`
    throw new OpenAIError(resp.status, msg)
  }

  const choice = data.choices?.[0]
  if (!choice) throw new OpenAIError(500, '응답에 choices가 없습니다.')

  const content = choice.message.content
  if (!content) throw new OpenAIError(500, '응답 content가 비어있습니다.')

  try {
    return JSON.parse(content) as T
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new OpenAIError(500, `응답 JSON 파싱 실패: ${msg}\n\n원문: ${content.slice(0, 400)}`)
  }
}
