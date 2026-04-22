import { useEffect, useState } from 'react'
import Modal from './Modal'
import {
  DEFAULT_MODEL,
  DEFAULT_OAUTH_MODEL,
  SUGGESTED_MODELS,
  SUGGESTED_OAUTH_MODELS,
  defaultModelFor,
  maskApiKey,
} from '../lib/openai'
import type { AuthMode, AuthStatus, OpenAISettings } from '../types'

interface Props {
  open: boolean
  settings: OpenAISettings
  authStatus: AuthStatus
  backendOk: boolean
  loginBusy: boolean
  authError: string | null
  onClose: () => void
  onSave: (next: OpenAISettings) => void
  onLogin: () => void
  onLogout: () => void
  onCancelLogin: () => void
}

export default function SettingsModal({
  open,
  settings,
  authStatus,
  backendOk,
  loginBusy,
  authError,
  onClose,
  onSave,
  onLogin,
  onLogout,
  onCancelLogin,
}: Props) {
  const [authMode, setAuthMode] = useState<AuthMode>(settings.authMode)
  const [apiKey, setApiKey] = useState(settings.apiKey)
  const [model, setModel] = useState(settings.model || defaultModelFor(settings.authMode))
  const [pistonUrl, setPistonUrl] = useState(settings.pistonUrl)
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    if (open) {
      setAuthMode(settings.authMode)
      setApiKey(settings.apiKey)
      setModel(settings.model || defaultModelFor(settings.authMode))
      setPistonUrl(settings.pistonUrl)
      setShowKey(false)
    }
  }, [open, settings])

  const handleModeChange = (next: AuthMode) => {
    if (next === authMode) return
    const currentIsDefault =
      model === DEFAULT_MODEL || model === DEFAULT_OAUTH_MODEL || !model.trim()
    setAuthMode(next)
    if (currentIsDefault) setModel(defaultModelFor(next))
  }

  const handleSave = () => {
    onSave({
      authMode,
      apiKey: apiKey.trim(),
      model: model.trim() || defaultModelFor(authMode),
      pistonUrl: pistonUrl.trim(),
    })
    onClose()
  }

  const modelSuggestions = authMode === 'oauth' ? SUGGESTED_OAUTH_MODELS : SUGGESTED_MODELS
  const modelPlaceholder = defaultModelFor(authMode)

  const expiresLabel = authStatus.expiresAt
    ? new Date(authStatus.expiresAt).toLocaleString('ko-KR')
    : null

  return (
    <Modal
      open={open}
      title="OpenAI 설정"
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            취소
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            저장
          </button>
        </>
      }
    >
      <div className="form-row">
        <label className="form-label">
          인증 방법
          <span className="form-hint">
            둘 중 하나를 선택하세요. 저장된 설정은 AI 문제 생성 시 자동으로 사용됩니다.
          </span>
        </label>
        <div className="segmented">
          <button
            type="button"
            className={`seg ${authMode === 'oauth' ? 'active' : ''}`}
            onClick={() => handleModeChange('oauth')}
          >
            🔐 Sign in with ChatGPT
          </button>
          <button
            type="button"
            className={`seg ${authMode === 'apikey' ? 'active' : ''}`}
            onClick={() => handleModeChange('apikey')}
          >
            🔑 API 키
          </button>
        </div>
      </div>

      {!backendOk && (
        <div className="form-warning">
          로컬 백엔드 서버(<code>localhost:1455</code>)가 실행 중이 아닌 것 같습니다.
          터미널에서 <code>npm run dev</code> 로 프론트와 백엔드를 함께 실행해주세요.
        </div>
      )}

      {authMode === 'oauth' && (
        <div className="auth-section">
          <div className="form-note compact">
            Codex CLI 와 동일한 PKCE OAuth 플로우로 로그인한 뒤,{' '}
            <a href="https://github.com/EvanZhouDev/openai-oauth" target="_blank" rel="noreferrer">
              openai-oauth
            </a>{' '}
            로컬 프록시(<code>:10531</code>) 를 자동으로 기동해 AI 호출을 ChatGPT Codex 백엔드로
            라우팅합니다. 토큰은 <code>~/.codearena/auth.json</code> 에 Codex CLI 포맷으로 저장됩니다.
          </div>

          {authStatus.loggedIn ? (
            <div className="auth-card ok">
              <div className="auth-card-head">
                <span className="auth-badge pass">✓ 로그인됨</span>
                {authStatus.accountId && (
                  <code className="auth-account">{authStatus.accountId}</code>
                )}
              </div>
              {expiresLabel && (
                <div className="auth-meta">토큰 만료: {expiresLabel} (자동 갱신)</div>
              )}
              <div className="auth-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={onLogout}
                >
                  로그아웃
                </button>
              </div>
            </div>
          ) : (
            <div className="auth-card">
              <p className="auth-desc">
                로그인되지 않았습니다. 아래 버튼을 누르면 브라우저가 열리고{' '}
                <a
                  href="https://auth.openai.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  auth.openai.com
                </a>{' '}
                에서 로그인할 수 있습니다.
              </p>
              {loginBusy ? (
                <div className="login-busy">
                  <button type="button" className="btn btn-primary" disabled>
                    <span className="spinner" />
                    로그인 창에서 진행해주세요...
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={onCancelLogin}
                  >
                    취소
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onLogin}
                  disabled={!backendOk}
                >
                  🔐 Sign in with ChatGPT
                </button>
              )}
            </div>
          )}

          {authError && <div className="form-error">⚠️ {authError}</div>}

          <details className="disclosure">
            <summary>⚠️ 알아두어야 할 점</summary>
            <ul>
              <li>
                OAuth 클라이언트로 <b>Codex CLI 의 공개 client_id</b>(<code>app_EMoamEEZ73f0CkXaXp7hrann</code>)를
                사용합니다. OpenAI 가 이를 변경/철회하면 인증이 중단될 수 있습니다.
              </li>
              <li>
                AI 호출은 <code>openai-oauth</code> 로컬 프록시를 거쳐{' '}
                <code>chatgpt.com/backend-api/codex</code> 로 라우팅됩니다.{' '}
                <b>ChatGPT Plus/Pro/Business/Edu/Enterprise 구독과 Codex 접근 권한이 필요</b>하며,
                사용량은 ChatGPT 의 5시간/주간 한도에 포함됩니다.
              </li>
              <li>
                사용 가능한 모델은 계정의 Codex 플랜에서 노출하는 모델(<code>gpt-5</code>,{' '}
                <code>gpt-5-codex</code> 등) 로 제한됩니다. 자동 탐지되므로 목록에 없는 모델을 넣으면
                실패합니다.
              </li>
              <li>
                토큰은 <code>~/.codearena/auth.json</code> 에 Codex CLI 와 동일한 포맷으로 저장됩니다
                (권한 0600).
              </li>
            </ul>
          </details>
        </div>
      )}

      {authMode === 'apikey' && (
        <div className="form-row">
          <label className="form-label">
            API 키
            <span className="form-hint">
              자신의 OpenAI API 키를 입력하세요. 브라우저 localStorage 에 저장되어 백엔드 프록시를
              통해 사용됩니다.
            </span>
          </label>
          <div className="input-with-action">
            <input
              type={showKey ? 'text' : 'password'}
              className="text-input mono"
              value={apiKey}
              placeholder="sk-..."
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowKey((v) => !v)}
            >
              {showKey ? '숨기기' : '보기'}
            </button>
            {apiKey && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setApiKey('')}
              >
                지우기
              </button>
            )}
          </div>
          {settings.apiKey && !showKey && (
            <div className="form-hint">
              현재 저장된 키: <code>{maskApiKey(settings.apiKey)}</code>
            </div>
          )}
          <div className="form-note compact">
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noreferrer"
            >
              platform.openai.com/api-keys 에서 키 발급 →
            </a>
          </div>
        </div>
      )}

      <div className="form-row">
        <label className="form-label">
          모델
          <span className="form-hint">
            Structured Outputs 를 지원하는 모델을 선택하세요. 직접 입력도 가능합니다.
          </span>
        </label>
        <input
          type="text"
          list="model-suggestions"
          className="text-input mono"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder={modelPlaceholder}
        />
        <datalist id="model-suggestions">
          {modelSuggestions.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        {authMode === 'oauth' && (
          <div className="form-hint">
            OAuth 모드는 <code>gpt-5</code>, <code>gpt-5-codex</code> 등 ChatGPT 에서 제공되는
            모델만 사용할 수 있습니다.
          </div>
        )}
      </div>

      <div className="form-row">
        <label className="form-label">
          Piston URL <span className="badge-sm">Java / C# 실행</span>
          <span className="form-hint">
            emkc.org 공개 API 는 2026-02-15 부터 <b>whitelist 전용</b>으로 변경됐습니다. 자체 호스팅한
            Piston 엔드포인트를 입력하거나 비워두면 서버 기본값을 사용합니다.
          </span>
        </label>
        <input
          type="text"
          className="text-input mono"
          value={pistonUrl}
          onChange={(e) => setPistonUrl(e.target.value)}
          placeholder="http://localhost:2000/api/v2/piston/execute"
          autoComplete="off"
          spellCheck={false}
        />
        <details className="disclosure">
          <summary>📦 자체 Piston 인스턴스 실행 (Docker)</summary>
          <pre className="code-block">{`docker run -d --name piston \\
  -p 2000:2000 \\
  ghcr.io/engineer-man/piston

# 이후 Piston 내부에 언어 런타임 설치 (Java / C# 예시)
docker exec piston piston-cli ppman install java
docker exec piston piston-cli ppman install csharp

# 그런 다음 위 입력창에
#   http://localhost:2000/api/v2/piston/execute
# 을 입력하세요.`}</pre>
        </details>
      </div>
    </Modal>
  )
}
