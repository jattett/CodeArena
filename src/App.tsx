import { useEffect, useMemo, useRef, useState } from 'react'
import Sidebar from './components/Sidebar'
import ProblemPanel from './components/ProblemPanel'
import EditorPanel from './components/EditorPanel'
import ResultPanel from './components/ResultPanel'
import SettingsModal from './components/SettingsModal'
import GenerateModal from './components/GenerateModal'
import { useRunner } from './hooks/useRunner'
import { useSettings } from './hooks/useSettings'
import { useProblems } from './hooks/useProblems'
import { useAuth } from './hooks/useAuth'
import { preloadRuntime } from './lib/executor'
import { generateProblem } from './lib/aiGenerator'
import { OpenAIError } from './lib/openai'
import type { GenerateRequest, Language } from './types'
import './styles/app.css'

const STORAGE_CODES = 'codearena.codes.v1'

type CodeMap = Record<string, string>

function loadCodeMap(): CodeMap {
  try {
    const raw = localStorage.getItem(STORAGE_CODES)
    return raw ? (JSON.parse(raw) as CodeMap) : {}
  } catch {
    return {}
  }
}

function saveCodeMap(map: CodeMap): void {
  try {
    localStorage.setItem(STORAGE_CODES, JSON.stringify(map))
  } catch {
    /* noop */
  }
}

type RuntimeState = 'idle' | 'loading' | 'ready'
interface RuntimeStatus {
  state: RuntimeState
  label: string
}
interface Toast {
  msg: string
  kind: 'info' | 'error' | 'success'
}

export default function App() {
  const problems = useProblems()
  const { settings, update: updateSettings, hasKey } = useSettings()
  const runner = useRunner()
  const auth = useAuth()

  const canGenerate =
    settings.authMode === 'oauth' ? auth.status.loggedIn : hasKey
  const authBadgeNeeded = !canGenerate

  const [problemId, setProblemId] = useState<string>(() => problems.all[0]?.id ?? '')
  const [language, setLanguage] = useState<Language>('javascript')
  const [codeMap, setCodeMap] = useState<CodeMap>(() => loadCodeMap())

  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus>({
    state: 'ready',
    label: 'JavaScript(Web Worker) 준비됨',
  })
  const [toast, setToast] = useState<Toast | null>(null)
  const toastTimer = useRef<number | null>(null)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [generateProgress, setGenerateProgress] = useState<{
    current: number
    total: number
  } | null>(null)

  const problem = useMemo(
    () => problems.findById(problemId) ?? problems.all[0],
    [problemId, problems],
  )

  useEffect(() => {
    if (!problem) return
    if (problem.id !== problemId) setProblemId(problem.id)
  }, [problem, problemId])

  const codeKey = problem ? `${problem.id}::${language}` : ''
  const code = problem ? codeMap[codeKey] ?? problem.starter[language] : ''

  useEffect(() => {
    if (!problem) return
    if (codeMap[codeKey] === undefined) {
      setCodeMap((prev) => ({ ...prev, [codeKey]: problem.starter[language] }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeKey, problem?.id])

  useEffect(() => {
    saveCodeMap(codeMap)
  }, [codeMap])

  useEffect(() => {
    runner.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemId, language])

  useEffect(() => {
    if (language === 'python') {
      setRuntimeStatus({ state: 'loading', label: 'Python(Pyodide) 로딩 중...' })
      preloadRuntime('python')
        .then(() => setRuntimeStatus({ state: 'ready', label: 'Python 준비 완료' }))
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err)
          setRuntimeStatus({ state: 'idle', label: `Python 로드 실패: ${msg}` })
        })
    } else if (language === 'javascript') {
      setRuntimeStatus({ state: 'ready', label: 'JavaScript(Web Worker) 준비됨' })
    } else if (language === 'java') {
      setRuntimeStatus({ state: 'ready', label: 'Java (Piston API · 원격)' })
    } else if (language === 'csharp') {
      setRuntimeStatus({ state: 'ready', label: 'C# (Piston API · 원격)' })
    }
  }, [language])

  const showToast = (msg: string, kind: Toast['kind'] = 'info') => {
    setToast({ msg, kind })
    if (toastTimer.current !== null) clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2600)
  }

  const handleCodeChange = (next: string) => {
    if (!problem) return
    setCodeMap((prev) => ({ ...prev, [codeKey]: next }))
  }

  const handleReset = () => {
    if (!problem) return
    if (!confirm('현재 코드를 기본 코드로 초기화할까요?')) return
    setCodeMap((prev) => ({ ...prev, [codeKey]: problem.starter[language] }))
    runner.reset()
  }

  const handleRun = async () => {
    if (!problem) return
    const summary = await runner.run({
      language,
      code,
      tests: problem.sampleTests,
      label: '예제',
      pistonUrl: settings.pistonUrl,
    })
    if (summary.kind === 'pass') showToast('예제 통과! 🎉', 'success')
  }

  const handleSubmit = async () => {
    if (!problem) return
    const allTests = [...problem.sampleTests, ...problem.hiddenTests]
    const summary = await runner.run({
      language,
      code,
      tests: allTests,
      label: '전체',
      pistonUrl: settings.pistonUrl,
    })
    if (summary.kind === 'pass') showToast('축하합니다! 모든 케이스 통과 ✅', 'success')
    else if (summary.kind === 'fail') showToast('일부 케이스 실패 ❌', 'error')
    else showToast('실행 오류 ⚠️', 'error')
  }

  const handleOpenGenerate = () => {
    setGenerateError(null)
    setGenerateOpen(true)
  }

  const handleGenerate = async (req: GenerateRequest) => {
    const total = Math.max(1, Math.min(10, req.problemCount || 1))
    setGenerating(true)
    setGenerateError(null)
    setGenerateProgress({ current: 0, total })

    const created: string[] = []
    let firstId: string | null = null
    let failure: string | null = null

    for (let i = 0; i < total; i++) {
      setGenerateProgress({ current: i + 1, total })
      try {
        const newProblem = await generateProblem(settings, req)
        problems.addGenerated(newProblem)
        created.push(newProblem.title)
        if (firstId === null) firstId = newProblem.id
      } catch (err) {
        failure =
          err instanceof OpenAIError
            ? err.message
            : err instanceof Error
              ? err.message
              : String(err)
        break
      }
    }

    setGenerating(false)
    setGenerateProgress(null)

    if (created.length > 0) {
      if (firstId) setProblemId(firstId)
      if (!failure) setGenerateOpen(false)
      if (total === 1) {
        showToast(`새 문제가 생성되었습니다: "${created[0]}"`, 'success')
      } else {
        showToast(`${created.length}/${total}개 문제가 생성되었습니다`, 'success')
      }
    }

    if (failure) {
      setGenerateError(
        created.length > 0
          ? `${created.length}개까지 성공 후 중단됨: ${failure}`
          : failure,
      )
    }
  }

  if (!problem) {
    return (
      <div style={{ padding: 40 }}>문제를 불러오지 못했습니다.</div>
    )
  }

  return (
    <>
      <header className="app-header">
        <div className="brand">
          <span className="logo">⚡</span>
          <h1>CodeArena</h1>
          <span className="tag">멀티 언어 코딩테스트 · AI 출제</span>
        </div>
        <div className="header-actions">
          <span className={`runtime-status ${runtimeStatus.state}`}>
            {runtimeStatus.label}
          </span>
          <button
            type="button"
            className={`btn btn-ghost ${authBadgeNeeded ? 'pulse' : ''}`}
            onClick={() => setSettingsOpen(true)}
            title="OpenAI 설정"
          >
            ⚙️ 설정
            {authBadgeNeeded && <span className="badge-dot" />}
            {settings.authMode === 'oauth' && auth.status.loggedIn && (
              <span className="badge-dot ok" />
            )}
          </button>
        </div>
      </header>

      <main className="app-main">
        <Sidebar
          builtin={problems.builtin}
          generated={problems.generated}
          selectedId={problemId}
          onSelect={setProblemId}
          onGenerate={handleOpenGenerate}
          onRemoveGenerated={(id) => {
            problems.removeGenerated(id)
            if (id === problemId) {
              const fallback = problems.all.find((p) => p.id !== id)
              if (fallback) setProblemId(fallback.id)
            }
          }}
        />
        <section className="content">
          <ProblemPanel problem={problem} />
          <EditorPanel
            code={code}
            onCodeChange={handleCodeChange}
            language={language}
            onLanguageChange={setLanguage}
            onReset={handleReset}
            onRun={handleRun}
            onSubmit={handleSubmit}
            running={runner.running}
          />
          <ResultPanel
            results={runner.results}
            summary={runner.summary}
            running={runner.running}
            stdoutPreview={runner.stdoutPreview}
          />
        </section>
      </main>

      <SettingsModal
        open={settingsOpen}
        settings={settings}
        authStatus={auth.status}
        backendOk={auth.backendState !== 'down'}
        toolchain={auth.toolchain ?? null}
        loginBusy={auth.loginBusy}
        authError={auth.error}
        onClose={() => setSettingsOpen(false)}
        onSave={updateSettings}
        onLogin={auth.login}
        onLogout={auth.logout}
        onCancelLogin={auth.cancelLogin}
      />

      <GenerateModal
        open={generateOpen}
        loading={generating}
        hasKey={canGenerate}
        error={generateError}
        progress={generateProgress}
        onClose={() => setGenerateOpen(false)}
        onGenerate={handleGenerate}
        onOpenSettings={() => {
          setGenerateOpen(false)
          setSettingsOpen(true)
        }}
      />

      <div
        className={`toast ${toast ? 'show' : ''} ${
          toast?.kind === 'error' ? 'error' : toast?.kind === 'success' ? 'success' : ''
        }`}
      >
        {toast?.msg}
      </div>
    </>
  )
}
