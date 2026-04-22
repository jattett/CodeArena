import type { ExecutionResult, Language } from '../types'

/**
 * 언어별 코드 실행기
 * 모든 실행기는 ExecutionResult { stdout, stderr, timeMs, timedOut } 를 반환합니다.
 *
 * - JavaScript: Web Worker 샌드박스
 * - Python: Pyodide (브라우저 내 Python 런타임)
 * - Java / C#: 로컬 Express 백엔드의 /api/run/piston 프록시 → Piston 인스턴스
 *   (emkc.org 공개 API 는 2026-02-15 부터 whitelist only. 자체 호스팅 권장.)
 */

const PISTON_PROXY_PATH = '/api/run/piston'

const PISTON_VERSIONS: Record<'java' | 'csharp', string> = {
  java: '15.0.2',
  csharp: '6.12.0',
}
const PISTON_LANG: Record<'java' | 'csharp', string> = {
  java: 'java',
  csharp: 'csharp',
}

/* ---------- JavaScript (Web Worker) ---------- */

const JS_WORKER_SRC = `
self.onmessage = async (e) => {
  const { code, stdin } = e.data;
  const logs = [];
  const errs = [];
  const origLog = console.log;
  const origErr = console.error;
  console.log = (...args) => logs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
  console.error = (...args) => errs.push(args.map(a => String(a)).join(' '));

  const t0 = performance.now();
  try {
    const fn = new Function('input', \`"use strict"; return (async () => { \${code} })();\`);
    await fn(stdin);
  } catch (err) {
    errs.push(err && err.stack ? err.stack : String(err));
  }
  const t1 = performance.now();

  console.log = origLog;
  console.error = origErr;

  self.postMessage({
    stdout: logs.join('\\n'),
    stderr: errs.join('\\n'),
    timeMs: t1 - t0,
    timedOut: false,
  });
};
`

interface RunOptions {
  timeoutMs?: number
}

function runJavaScript(
  code: string,
  stdin: string,
  { timeoutMs = 5000 }: RunOptions = {},
): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    const blob = new Blob([JS_WORKER_SRC], { type: 'application/javascript' })
    const url = URL.createObjectURL(blob)
    const worker = new Worker(url)

    let settled = false
    const cleanup = () => {
      worker.terminate()
      URL.revokeObjectURL(url)
    }

    const timer = window.setTimeout(() => {
      if (settled) return
      settled = true
      cleanup()
      resolve({
        stdout: '',
        stderr: `실행 시간이 ${timeoutMs}ms를 초과했습니다.`,
        timeMs: timeoutMs,
        timedOut: true,
      })
    }, timeoutMs)

    worker.onmessage = (e: MessageEvent<ExecutionResult>) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      cleanup()
      resolve(e.data)
    }

    worker.onerror = (e: ErrorEvent) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      cleanup()
      resolve({
        stdout: '',
        stderr: e.message || 'Worker error',
        timeMs: 0,
        timedOut: false,
      })
    }

    worker.postMessage({ code, stdin })
  })
}

/* ---------- Python (Pyodide) ---------- */

let pyodidePromise: Promise<PyodideInterface> | null = null

function getPyodide(): Promise<PyodideInterface> {
  if (pyodidePromise) return pyodidePromise
  pyodidePromise = (async () => {
    if (typeof window.loadPyodide !== 'function') {
      throw new Error('Pyodide가 로드되지 않았습니다.')
    }
    const py = await window.loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/',
    })
    return py
  })()
  return pyodidePromise
}

async function runPython(code: string, stdin: string): Promise<ExecutionResult> {
  const py = await getPyodide()
  const t0 = performance.now()
  let stdout = ''
  let stderr = ''
  try {
    let sent = false
    py.setStdin({
      stdin: () => {
        if (sent) return ''
        sent = true
        return stdin
      },
    })
    const outBuf: string[] = []
    const errBuf: string[] = []
    py.setStdout({ batched: (s: string) => outBuf.push(s) })
    py.setStderr({ batched: (s: string) => errBuf.push(s) })

    await py.runPythonAsync(code)
    stdout = outBuf.join('\n')
    stderr = errBuf.join('\n')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    stderr += (stderr ? '\n' : '') + msg
  }
  const t1 = performance.now()
  return { stdout, stderr, timeMs: t1 - t0, timedOut: false }
}

/* ---------- Piston API (Java, C#) ---------- */

interface PistonResponse {
  compile?: { stdout: string; stderr: string }
  run?: { stdout: string; stderr: string; signal: string | null }
}

interface PistonProxyErrorBody {
  error?: string
  hint?: string
  raw?: string
}

async function runPiston(
  language: 'java' | 'csharp',
  code: string,
  stdin: string,
  pistonUrl: string,
): Promise<ExecutionResult> {
  const payload = {
    language: PISTON_LANG[language],
    version: PISTON_VERSIONS[language],
    files: [
      {
        name: language === 'java' ? 'Main.java' : 'Program.cs',
        content: code,
      },
    ],
    stdin,
    compile_timeout: 10000,
    run_timeout: 5000,
  }
  const t0 = performance.now()
  let resp: Response
  try {
    resp = await fetch(PISTON_PROXY_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: pistonUrl || undefined,
        payload,
      }),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      stdout: '',
      stderr: `네트워크 오류: ${msg}\n(로컬 백엔드(/api/run/piston)에 연결할 수 없습니다. 'npm run dev' 가 실행 중인지 확인하세요.)`,
      timeMs: performance.now() - t0,
      timedOut: false,
    }
  }
  const t1 = performance.now()
  if (!resp.ok) {
    let body: PistonProxyErrorBody | null = null
    try {
      body = (await resp.json()) as PistonProxyErrorBody
    } catch {
      body = { error: await resp.text() }
    }
    const lines = [
      body?.error ? `⚠️ ${body.error}` : `Piston 오류 (${resp.status})`,
      body?.hint ? body.hint : '',
    ].filter(Boolean)
    return {
      stdout: '',
      stderr: lines.join('\n\n'),
      timeMs: t1 - t0,
      timedOut: false,
    }
  }
  const data: PistonResponse = await resp.json()
  const compileErr = data.compile?.stderr ?? ''
  const runOut = data.run?.stdout ?? ''
  const runErr = data.run?.stderr ?? ''
  return {
    stdout: runOut,
    stderr: [compileErr, runErr].filter(Boolean).join('\n'),
    timeMs: t1 - t0,
    timedOut: !!data.run?.signal,
  }
}

/* ---------- Dispatcher ---------- */

export interface RunCodeOptions {
  /** 사용자 설정 Piston URL (Java/C# 만 사용). 빈 문자열이면 서버 기본값 사용. */
  pistonUrl?: string
}

export async function runCode(
  language: Language,
  code: string,
  stdin: string,
  opts: RunCodeOptions = {},
): Promise<ExecutionResult> {
  switch (language) {
    case 'javascript':
      return runJavaScript(code, stdin)
    case 'python':
      return runPython(code, stdin)
    case 'java':
    case 'csharp':
      return runPiston(language, code, stdin, opts.pistonUrl ?? '')
    default: {
      const _exhaustive: never = language
      return {
        stdout: '',
        stderr: `알 수 없는 언어: ${_exhaustive as string}`,
        timeMs: 0,
        timedOut: false,
      }
    }
  }
}

/* ---------- Helpers ---------- */

export async function preloadRuntime(language: Language): Promise<void> {
  if (language === 'python') {
    await getPyodide()
  }
}

export function normalizeOutput(s: string | null | undefined): string {
  if (s == null) return ''
  return String(s)
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n+$/g, '')
}
