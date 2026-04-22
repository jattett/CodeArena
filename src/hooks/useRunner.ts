import { useState, useCallback } from 'react'
import { runCode, normalizeOutput } from '../lib/executor'
import type {
  CaseResult,
  ExecutionResult,
  Language,
  RunSummary,
  TestCase,
} from '../types'

export interface RunArgs {
  language: Language
  code: string
  tests: TestCase[]
  label?: string
}

export interface UseRunnerReturn {
  results: CaseResult[]
  summary: RunSummary | null
  running: boolean
  stdoutPreview: string
  run: (args: RunArgs) => Promise<RunSummary>
  reset: () => void
}

export function useRunner(): UseRunnerReturn {
  const [results, setResults] = useState<CaseResult[]>([])
  const [summary, setSummary] = useState<RunSummary | null>(null)
  const [running, setRunning] = useState(false)
  const [stdoutPreview, setStdoutPreview] = useState('')

  const run = useCallback(
    async ({ language, code, tests, label = '예제' }: RunArgs): Promise<RunSummary> => {
      setRunning(true)
      setSummary(null)
      setStdoutPreview('')

      const initial: CaseResult[] = tests.map((t) => ({
        name: t.name,
        stdin: t.stdin,
        expected: t.expected,
        actual: '',
        stderr: '',
        timeMs: 0,
        status: 'running',
      }))
      setResults(initial)

      const finalResults: CaseResult[] = [...initial]
      let lastStdout = ''

      for (let i = 0; i < tests.length; i++) {
        const t = tests[i]
        let res: ExecutionResult
        try {
          res = await runCode(language, code, t.stdin)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          res = { stdout: '', stderr: msg, timeMs: 0, timedOut: false }
        }

        const actual = normalizeOutput(res.stdout)
        const expected = normalizeOutput(t.expected)
        let status: CaseResult['status']
        if (res.stderr && !actual) status = 'error'
        else if (actual === expected) status = 'pass'
        else status = 'fail'

        lastStdout = res.stdout || res.stderr || ''

        finalResults[i] = {
          name: t.name,
          stdin: t.stdin,
          expected: t.expected,
          actual: res.stdout || '',
          stderr: res.stderr || '',
          timeMs: res.timeMs || 0,
          status,
        }
        setResults([...finalResults])
        setStdoutPreview(lastStdout)
      }

      const passed = finalResults.filter((r) => r.status === 'pass').length
      const hasErr = finalResults.some((r) => r.status === 'error')
      let newSummary: RunSummary
      if (passed === finalResults.length) {
        newSummary = {
          kind: 'pass',
          message: `🎉 모든 ${label} 케이스 통과! (${passed}/${finalResults.length})`,
        }
      } else if (hasErr && passed === 0) {
        newSummary = {
          kind: 'error',
          message: `⚠️ 실행 중 오류가 발생했습니다. 에러 메시지를 확인하세요.`,
        }
      } else {
        newSummary = {
          kind: 'fail',
          message: `❌ 일부 ${label} 케이스 실패 (${passed}/${finalResults.length} 통과)`,
        }
      }
      setSummary(newSummary)
      setRunning(false)
      return newSummary
    },
    [],
  )

  const reset = useCallback(() => {
    setResults([])
    setSummary(null)
    setStdoutPreview('')
  }, [])

  return { results, summary, running, stdoutPreview, run, reset }
}
