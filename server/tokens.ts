import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

/**
 * 토큰 저장소
 *
 * `~/.codearena/auth.json` 에 ChatGPT OAuth 토큰을 저장합니다.
 * Codex CLI 가 사용하는 포맷과 동일하게 저장하여 `openai-oauth` 가 이 파일을 그대로 읽을 수 있도록 합니다.
 *
 *   {
 *     "OPENAI_API_KEY": null,
 *     "auth_mode": "chatgpt",
 *     "tokens": {
 *       "access_token": "...",
 *       "refresh_token": "...",
 *       "id_token": "...",
 *       "account_id": "..."
 *     },
 *     "last_refresh": "2026-04-22T05:00:00.000Z"
 *   }
 */

export interface StoredTokens {
  accessToken: string
  refreshToken: string | null
  idToken: string | null
  accountId: string | null
  obtainedAt: number
  expiresIn: number
  tokenType: string
}

interface CodexAuthFile {
  OPENAI_API_KEY: string | null
  auth_mode?: 'chatgpt' | 'api-key'
  tokens?: {
    access_token?: string
    refresh_token?: string
    id_token?: string
    account_id?: string
  }
  last_refresh?: string
  /** CodeArena 고유: 만료시간 계산을 위한 메타 (Codex CLI 는 이 필드를 무시) */
  codearena?: {
    obtained_at?: number
    expires_in?: number
    token_type?: string
  }
}

export const AUTH_DIR = path.join(os.homedir(), '.codearena')
export const AUTH_FILE = path.join(AUTH_DIR, 'auth.json')

export async function saveTokens(t: StoredTokens): Promise<void> {
  await fs.mkdir(AUTH_DIR, { recursive: true })
  const payload: CodexAuthFile = {
    OPENAI_API_KEY: null,
    auth_mode: 'chatgpt',
    tokens: {
      access_token: t.accessToken,
      refresh_token: t.refreshToken ?? undefined,
      id_token: t.idToken ?? undefined,
      account_id: t.accountId ?? undefined,
    },
    last_refresh: new Date(t.obtainedAt).toISOString(),
    codearena: {
      obtained_at: t.obtainedAt,
      expires_in: t.expiresIn,
      token_type: t.tokenType,
    },
  }
  await fs.writeFile(AUTH_FILE, JSON.stringify(payload, null, 2), { mode: 0o600 })
}

interface LegacyAuthFile {
  accessToken?: string
  refreshToken?: string | null
  idToken?: string | null
  accountId?: string | null
  obtainedAt?: number
  expiresIn?: number
  tokenType?: string
}

export async function loadTokens(): Promise<StoredTokens | null> {
  try {
    const raw = await fs.readFile(AUTH_FILE, 'utf8')
    const json = JSON.parse(raw) as CodexAuthFile & LegacyAuthFile

    // Codex 포맷
    const tk = json.tokens
    if (tk?.access_token) {
      const accessToken: string = tk.access_token
      const obtainedAt =
        json.codearena?.obtained_at ??
        (json.last_refresh ? Date.parse(json.last_refresh) : Date.now())
      const expiresIn = json.codearena?.expires_in ?? 28 * 24 * 60 * 60
      const tokenType = json.codearena?.token_type ?? 'bearer'
      return {
        accessToken,
        refreshToken: tk.refresh_token ?? null,
        idToken: tk.id_token ?? null,
        accountId: tk.account_id ?? null,
        obtainedAt,
        expiresIn,
        tokenType,
      }
    }

    // 레거시 포맷 → 자동 마이그레이션
    if (json.accessToken) {
      const migrated: StoredTokens = {
        accessToken: json.accessToken,
        refreshToken: json.refreshToken ?? null,
        idToken: json.idToken ?? null,
        accountId: json.accountId ?? null,
        obtainedAt: json.obtainedAt ?? Date.now(),
        expiresIn: json.expiresIn ?? 28 * 24 * 60 * 60,
        tokenType: json.tokenType ?? 'bearer',
      }
      await saveTokens(migrated)
      console.log('[tokens] 레거시 auth.json 을 Codex 포맷으로 마이그레이션했습니다.')
      return migrated
    }
    return null
  } catch {
    return null
  }
}

export async function clearTokens(): Promise<void> {
  try {
    await fs.unlink(AUTH_FILE)
  } catch {
    /* ignore */
  }
}

export function isExpired(t: StoredTokens, safetyMargin = 60): boolean {
  const expiresAt = t.obtainedAt + t.expiresIn * 1000
  return Date.now() >= expiresAt - safetyMargin * 1000
}

/**
 * JWT payload 를 단순 디코드 (검증 없음, 읽기 전용)
 */
export function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    const parts = jwt.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4)
    const json = Buffer.from(padded, 'base64').toString('utf8')
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

export function extractChatGPTAccountId(idToken: string | null): string | null {
  if (!idToken) return null
  const payload = decodeJwtPayload(idToken)
  if (!payload) return null
  const authClaims = payload['https://api.openai.com/auth']
  if (authClaims && typeof authClaims === 'object') {
    const a = authClaims as Record<string, unknown>
    if (typeof a.chatgpt_account_id === 'string') return a.chatgpt_account_id
  }
  return null
}
