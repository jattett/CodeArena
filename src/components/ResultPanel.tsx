import { useState, useMemo } from 'react'
import type { CaseResult, CaseStatus, RunSummary } from '../types'

interface ResultPanelProps {
  results: CaseResult[]
  summary: RunSummary | null
  running: boolean
  stdoutPreview: string
}

const STATUS_META: Record<CaseStatus, { label: string; cls: string }> = {
  pass: { label: '✓', cls: 'pass' },
  fail: { label: '✗', cls: 'fail' },
  error: { label: '!', cls: 'error' },
  running: { label: '…', cls: 'running' },
}

type TabId = 'results' | 'stdout' | 'stats'

interface TestCaseRowProps {
  result: CaseResult
  index: number
  openIdx: number
  setOpenIdx: (idx: number) => void
}

function TestCaseRow({ result, index, openIdx, setOpenIdx }: TestCaseRowProps) {
  const open = openIdx === index
  const meta = STATUS_META[result.status]

  return (
    <li className={`tc-item ${open ? 'open' : ''}`}>
      <div className="tc-head" onClick={() => setOpenIdx(open ? -1 : index)}>
        <div className="tc-left">
          <span className={`tc-status ${meta.cls}`}>{meta.label}</span>
          <span className="tc-name">{result.name}</span>
        </div>
        <span className="tc-time">
          {result.status === 'running' ? '실행 중...' : `${result.timeMs.toFixed(1)} ms`}
        </span>
      </div>
      <div className="tc-body">
        <div className="diff-row">
          <span className="lbl">입력</span>
          <pre>{result.stdin || '(없음)'}</pre>
        </div>
        <div className="diff-row">
          <span className="lbl">기대</span>
          <pre>{result.expected}</pre>
        </div>
        <div className="diff-row">
          <span className="lbl">실제</span>
          <pre className={result.status === 'fail' ? 'err' : ''}>
            {result.actual || '(출력 없음)'}
          </pre>
        </div>
        {result.stderr && (
          <div className="diff-row">
            <span className="lbl">에러</span>
            <pre className="err">{result.stderr}</pre>
          </div>
        )}
      </div>
    </li>
  )
}

interface Stats {
  total: number
  max: number
  avg: number
  passed: number
  count: number
  maxForBar: number
}

export default function ResultPanel({
  results,
  summary,
  running,
  stdoutPreview,
}: ResultPanelProps) {
  const [tab, setTab] = useState<TabId>('results')
  const [openIdx, setOpenIdx] = useState(-1)

  const stats = useMemo<Stats | null>(() => {
    const finished = results.filter((r) => r.status !== 'running')
    if (finished.length === 0) return null
    const times = finished.map((r) => r.timeMs)
    const total = times.reduce((a, b) => a + b, 0)
    const max = Math.max(...times)
    const avg = total / finished.length
    const passed = finished.filter((r) => r.status === 'pass').length
    return {
      total,
      max,
      avg,
      passed,
      count: finished.length,
      maxForBar: Math.max(max, 1),
    }
  }, [results])

  const summaryCls = !summary
    ? 'empty'
    : summary.kind === 'pass'
    ? 'pass'
    : summary.kind === 'fail'
    ? 'fail'
    : 'error'

  return (
    <div className="result-panel">
      <div className="result-tabs">
        <button
          className={`tab ${tab === 'results' ? 'active' : ''}`}
          onClick={() => setTab('results')}
        >
          결과
        </button>
        <button
          className={`tab ${tab === 'stdout' ? 'active' : ''}`}
          onClick={() => setTab('stdout')}
        >
          출력(stdout)
        </button>
        <button
          className={`tab ${tab === 'stats' ? 'active' : ''}`}
          onClick={() => setTab('stats')}
        >
          속도 / 통계
        </button>
      </div>

      <div className={`tab-content ${tab === 'results' ? 'active' : ''}`}>
        <div className={`summary ${summaryCls}`}>
          {summary
            ? summary.message
            : running
            ? '실행 중입니다...'
            : '아직 실행하지 않았습니다. ▶ 예제 실행 또는 ✓ 제출하기를 눌러주세요.'}
        </div>
        <ul className="test-case-list">
          {results.map((r, i) => (
            <TestCaseRow
              key={i}
              index={i}
              result={r}
              openIdx={openIdx}
              setOpenIdx={setOpenIdx}
            />
          ))}
        </ul>
      </div>

      <div className={`tab-content ${tab === 'stdout' ? 'active' : ''}`}>
        <pre className="stdout-view">
          {stdoutPreview || '여기에 (가장 최근 실행된) 프로그램의 표준 출력이 표시됩니다.'}
        </pre>
      </div>

      <div className={`tab-content ${tab === 'stats' ? 'active' : ''}`}>
        <div className="stats-view">
          <div className="stat-card">
            <span className="stat-label">총 실행 시간</span>
            <span className="stat-value">{stats ? `${stats.total.toFixed(1)} ms` : '-'}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">평균 / 케이스</span>
            <span className="stat-value">{stats ? `${stats.avg.toFixed(1)} ms` : '-'}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">최대 시간</span>
            <span className="stat-value">{stats ? `${stats.max.toFixed(1)} ms` : '-'}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">통과율</span>
            <span className="stat-value">
              {stats ? `${stats.passed}/${stats.count}` : '-'}
            </span>
          </div>
        </div>

        <div className="bar-chart-wrap">
          <h3>케이스별 실행 시간 (ms)</h3>
          <div className="bar-chart">
            {results.length === 0 && (
              <div style={{ color: 'var(--text-mute)', fontSize: 13 }}>
                데이터가 없습니다.
              </div>
            )}
            {results.map((r, i) => {
              const max = stats?.maxForBar ?? 1
              const pct =
                r.status === 'running' ? 0 : Math.max(2, (r.timeMs / max) * 100)
              return (
                <div key={i} className="bar-row">
                  <span className="bar-label">{r.name}</span>
                  <div className="bar-track">
                    <div
                      className={`bar-fill ${
                        r.status === 'fail' || r.status === 'error' ? 'fail' : ''
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="bar-val">
                    {r.status === 'running' ? '...' : `${r.timeMs.toFixed(1)} ms`}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
