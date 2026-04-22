import type { AuthStatus } from '../types'

/**
 * 로컬 Express 백엔드(/api/*, /auth/*) 와 통신하는 클라이언트 래퍼.
 */

export class BackendUnavailable extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackendUnavailable'
  }
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  let resp: Response
  try {
    resp = await fetch(path, init)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new BackendUnavailable(
      `백엔드 서버에 연결할 수 없습니다. ('npm run dev' 가 실행 중인지 확인해주세요) · ${msg}`,
    )
  }
  const text = await resp.text()
  let data: unknown
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    throw new Error(`잘못된 응답: ${text.slice(0, 200)}`)
  }
  if (!resp.ok) {
    const err = (data as { error?: { message?: string } }).error
    throw new Error(err?.message || `HTTP ${resp.status}`)
  }
  return data as T
}

export interface HealthInfo {
  ok: boolean
  version?: string
  toolchain?: {
    java: { available: boolean; path?: string }
    csharp: { available: boolean; path?: string }
  }
}

export async function checkHealth(): Promise<boolean> {
  try {
    await json<HealthInfo>('/api/health')
    return true
  } catch {
    return false
  }
}

export async function fetchHealth(): Promise<HealthInfo | null> {
  try {
    return await json<HealthInfo>('/api/health')
  } catch {
    return null
  }
}

export function fetchAuthStatus(): Promise<AuthStatus> {
  return json<AuthStatus>('/api/auth/status')
}

export function logout(): Promise<{ ok: boolean }> {
  return json<{ ok: boolean }>('/api/auth/logout', { method: 'POST' })
}

export async function startLogin(): Promise<{ authorizeUrl: string; state: string }> {
  return json<{ authorizeUrl: string; state: string }>('/auth/login')
}
