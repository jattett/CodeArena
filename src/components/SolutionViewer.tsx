import Editor from '@monaco-editor/react'
import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal'
import type { Language, Solution, SolutionKind } from '../types'
import { LANGUAGES } from '../data/problems'

interface SolutionViewerProps {
  open: boolean
  solutions: Solution[] | undefined
  language: Language
  onClose: () => void
  /** "이 코드로 바꾸기" 눌렀을 때 에디터에 적용할 콜백. */
  onApply: (code: string, language: Language) => void
}

const KIND_LABEL: Record<SolutionKind, string> = {
  standard: '기본',
  concise: '간결',
  optimized: '최적화',
}

export default function SolutionViewer({
  open,
  solutions,
  language,
  onClose,
  onApply,
}: SolutionViewerProps) {
  const list = useMemo(() => solutions ?? [], [solutions])
  const [activeIdx, setActiveIdx] = useState(0)
  const [activeLang, setActiveLang] = useState<Language>(language)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    if (open) {
      setActiveIdx(0)
      setActiveLang(language)
      setRevealed(false)
    }
  }, [open, language])

  const active = list[activeIdx]
  const code = active?.code[activeLang] ?? ''

  const footer = active ? (
    <div className="solution-footer">
      <span className="hint-text">⚠️ 실력 향상을 위해 먼저 직접 풀어보는 걸 추천드려요.</span>
      <div className="footer-actions">
        <button className="btn btn-ghost" onClick={onClose}>
          닫기
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => navigator.clipboard?.writeText(code)}
          disabled={!revealed || !code}
          title="코드 복사"
        >
          📋 복사
        </button>
        <button
          className="btn btn-primary"
          onClick={() => {
            onApply(code, activeLang)
            onClose()
          }}
          disabled={!revealed || !code}
        >
          이 코드로 바꾸기
        </button>
      </div>
    </div>
  ) : null

  return (
    <Modal open={open} title="💡 답 보기" onClose={onClose} footer={footer} size="lg">
      {list.length === 0 ? (
        <div className="empty-answers">
          <p>이 문제에는 등록된 참조 풀이가 없습니다.</p>
          <p className="muted">AI 로 생성된 일부 예전 문제에는 풀이가 포함되지 않을 수 있습니다.</p>
        </div>
      ) : (
        <>
          <div className="solution-tabs">
            {list.map((s, i) => (
              <button
                key={i}
                className={`solution-tab ${i === activeIdx ? 'active' : ''}`}
                onClick={() => {
                  setActiveIdx(i)
                  setRevealed(false)
                }}
                type="button"
              >
                <span className={`kind-badge kind-${s.kind}`}>{KIND_LABEL[s.kind]}</span>
                <span className="tab-title">{s.title}</span>
              </button>
            ))}
          </div>

          {active && (
            <div className="solution-body">
              {active.description && (
                <p className="solution-desc">{active.description}</p>
              )}

              <div className="solution-lang-bar">
                <div className="lang-pills">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      className={`lang-pill ${activeLang === l.id ? 'active' : ''}`}
                      onClick={() => setActiveLang(l.id)}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="solution-code-wrap">
                <div className={`solution-code ${revealed ? '' : 'blurred'}`}>
                  <Editor
                    height="360px"
                    theme="vs-dark"
                    language={activeLang}
                    value={code}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 13,
                      scrollBeyondLastLine: false,
                      smoothScrolling: true,
                      padding: { top: 12 },
                      lineNumbers: 'on',
                    }}
                  />
                </div>

                {!revealed && (
                  <button
                    type="button"
                    className="reveal-overlay"
                    onClick={() => setRevealed(true)}
                  >
                    <div className="reveal-card">
                      <div className="reveal-icon">👁️</div>
                      <div className="reveal-title">정답 보기</div>
                      <div className="reveal-sub">
                        {active.title} · 클릭하면 코드가 공개됩니다
                      </div>
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
