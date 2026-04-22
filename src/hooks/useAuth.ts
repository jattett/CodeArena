import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BackendUnavailable,
  checkHealth,
  fetchAuthStatus,
  logout as logoutRequest,
  startLogin,
} from '../lib/authClient'
import type { AuthStatus } from '../types'

type BackendState = 'unknown' | 'ok' | 'down'

export interface UseAuthReturn {
  status: AuthStatus
  backendState: BackendState
  refreshing: boolean
  loginBusy: boolean
  error: string | null
  login: () => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  cancelLogin: () => void
}

const BACKEND_POLL_MS = 20_000

export function useAuth(): UseAuthReturn {
  const [status, setStatus] = useState<AuthStatus>({ loggedIn: false })
  const [backendState, setBackendState] = useState<BackendState>('unknown')
  const [refreshing, setRefreshing] = useState(false)
  const [loginBusy, setLoginBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pollingLogin = useRef<number | null>(null)

  const pingBackend = useCallback(async () => {
    const ok = await checkHealth()
    setBackendState(ok ? 'ok' : 'down')
    return ok
  }, [])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    setError(null)
    try {
      if (!(await pingBackend())) return
      const s = await fetchAuthStatus()
      setStatus(s)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    } finally {
      setRefreshing(false)
    }
  }, [pingBackend])

  useEffect(() => {
    void refresh()
    const t = window.setInterval(() => void pingBackend(), BACKEND_POLL_MS)
    return () => clearInterval(t)
  }, [refresh, pingBackend])

  const stopPolling = useCallback(() => {
    if (pollingLogin.current !== null) {
      clearInterval(pollingLogin.current)
      pollingLogin.current = null
    }
  }, [])

  const login = useCallback(async () => {
    setLoginBusy(true)
    setError(null)
    try {
      if (!(await pingBackend())) {
        throw new BackendUnavailable('백엔드 서버가 실행 중이 아닙니다.')
      }
      const { authorizeUrl } = await startLogin()

      const w = 560
      const h = 720
      const left = window.screenX + (window.outerWidth - w) / 2
      const top = window.screenY + (window.outerHeight - h) / 2
      // 주의: popup handle 은 의도적으로 저장하지 않습니다. auth.openai.com 의 COOP 헤더가
      // window.closed / window.close() 접근을 모두 차단하므로, 참조를 들고 있으면 브라우저가
      // 콘솔에 경고 로그를 남깁니다. 로그인 완료는 백엔드 status 폴링만으로 감지합니다.
      const opened = window.open(
        authorizeUrl,
        'codearena_oauth',
        `width=${w},height=${h},left=${left},top=${top},resizable=yes`,
      )
      if (!opened) {
        throw new Error('팝업이 차단되었습니다. 브라우저에서 이 사이트의 팝업을 허용해주세요.')
      }

      stopPolling()
      const startedAt = Date.now()
      const MAX_MS = 5 * 60_000
      // NOTE: popup.closed / popup.close() 는 auth.openai.com 의 COOP 헤더 때문에
      // 브라우저 콘솔에 경고를 남기므로 *접근하지 않습니다*. 로그인 완료는
      // 백엔드 status 폴링만으로 판정하고, 팝업은 서버가 응답한 success HTML 에
      // 포함된 `setTimeout(window.close, 3000)` 가 스스로 닫도록 합니다.
      pollingLogin.current = window.setInterval(async () => {
        try {
          const s = await fetchAuthStatus()
          if (s.loggedIn) {
            setStatus(s)
            stopPolling()
            setLoginBusy(false)
            return
          }
        } catch {
          /* keep polling */
        }
        if (Date.now() - startedAt > MAX_MS) {
          stopPolling()
          setLoginBusy(false)
          setError('로그인 시간이 초과됐습니다 (5분). 창을 닫고 다시 시도해주세요.')
        }
      }, 1500)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      setLoginBusy(false)
    }
  }, [pingBackend, stopPolling])

  const cancelLogin = useCallback(() => {
    stopPolling()
    setLoginBusy(false)
    setError(null)
  }, [stopPolling])

  const logout = useCallback(async () => {
    try {
      await logoutRequest()
      setStatus({ loggedIn: false })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    }
  }, [])

  useEffect(() => () => stopPolling(), [stopPolling])

  return {
    status,
    backendState,
    refreshing,
    loginBusy,
    error,
    login,
    logout,
    refresh,
    cancelLogin,
  }
}
