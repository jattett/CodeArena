import { useState, useCallback } from 'react'
import { runSolution } from '../lib/executor'
import { deepEqual, formatCall, formatValue } from '../lib/signatures'
import type {
  CaseResult,
  FunctionSignature,
  FunctionTestCase,
  Language,
  RunSummary,
} from '../types'

export interface RunArgs {
  language: Language
  code: string
  tests: FunctionTestCase[]
  signature: FunctionSignature
  label?: string
  pistonUrl?: string
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
    async ({
      language,
      code,
      tests,
      signature,
      label = '예제',
      pistonUrl,
    }: RunArgs): Promise<RunSummary> => {
      setRunning(true)
      setSummary(null)
      setStdoutPreview('')

      const initial: CaseResult[] = tests.map((t) => ({
        name: t.name,
        argsDisplay: formatCall(signature, t.args),
        expectedDisplay: formatValue(t.expected),
        actualDisplay: '',
        stderr: '',
        timeMs: 0,
        status: 'running',
      }))
      setResults(initial)

      const finalResults: CaseResult[] = [...initial]
      let lastStdout = ''

      for (let i = 0; i < tests.length; i++) {
        const t = tests[i]
        let actualValue: unknown = undefined
        let stderrStr = ''
        let timeMs = 0
        let status: CaseResult['status']

        try {
          const res = await runSolution(language, code, t.args, signature, { pistonUrl })
          stderrStr = res.stderr || ''
          timeMs = res.timeMs || 0
          if (res.timedOut) {
            status = 'error'
            stderrStr = stderrStr || `실행 시간 초과`
          } else if (!res.hasReturn) {
            status = 'error'
            if (!stderrStr) {
              stderrStr = `반환값을 찾을 수 없습니다. ${signature.functionName}() 함수가 올바르게 정의되어 있는지, 값을 return 했는지 확인하세요.`
            }
          } else {
            actualValue = res.returnValue
            status = deepEqual(actualValue, t.expected) ? 'pass' : 'fail'
          }
          lastStdout = res.userStdout || res.stdout || res.stderr || ''
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          stderrStr = msg
          status = 'error'
        }

        finalResults[i] = {
          name: t.name,
          argsDisplay: formatCall(signature, t.args),
          expectedDisplay: formatValue(t.expected),
          actualDisplay: status === 'error' ? '(오류)' : formatValue(actualValue),
          stderr: stderrStr,
          timeMs,
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
