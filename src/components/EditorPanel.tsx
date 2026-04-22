import Editor from '@monaco-editor/react'
import { LANGUAGES } from '../data/problems'
import type { Language } from '../types'

interface EditorPanelProps {
  code: string
  onCodeChange: (next: string) => void
  language: Language
  onLanguageChange: (lang: Language) => void
  onReset: () => void
  onRun: () => void
  onSubmit: () => void
  running: boolean
}

export default function EditorPanel({
  code,
  onCodeChange,
  language,
  onLanguageChange,
  onReset,
  onRun,
  onSubmit,
  running,
}: EditorPanelProps) {
  return (
    <div className="editor-panel">
      <div className="editor-toolbar">
        <div className="toolbar-left">
          <select
            className="lang-select"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as Language)}
            disabled={running}
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
          <button
            className="btn btn-ghost"
            onClick={onReset}
            disabled={running}
            title="기본 코드로 초기화"
          >
            ↺ 초기화
          </button>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-secondary" onClick={onRun} disabled={running}>
            ▶ 예제 실행
          </button>
          <button className="btn btn-primary" onClick={onSubmit} disabled={running}>
            ✓ 제출하기
          </button>
        </div>
      </div>
      <div className="editor">
        <Editor
          height="100%"
          theme="vs-dark"
          language={language}
          value={code}
          onChange={(v) => onCodeChange(v ?? '')}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            tabSize: 2,
            automaticLayout: true,
            smoothScrolling: true,
            fontLigatures: true,
            padding: { top: 12 },
          }}
        />
      </div>
    </div>
  )
}
