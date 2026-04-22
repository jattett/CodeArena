import type { ExecutionResult, FunctionSignature, Language } from '../types'
import { encodeArgsToStdin, extractResult, wrapForExecution } from './signatures'

/**
 * 코드 실행기 — 프로그래머스 스타일 함수 실행에 최적화.
 *
 * 공개 API:
 *   runRaw(lang, code, stdin, opts)          — 원시 실행 (stdout/stderr 만 반환)
 *   runSolution(lang, userCode, args, sig)   — 사용자 코드(함수 하나)를 래퍼로 감싸 실행하고
 *                                              JSON 으로 직렬화된 반환값까지 파싱해 리턴
 *
 * - JavaScript: Web Worker 샌드박스
 * - Python:     Pyodide
 * - Java/C#:    로컬 백엔드 /api/run/local (툴체인 없으면 Piston 폴백)
 */

const LOCAL_RUN_PATH = '/api/run/local'
const PISTON_PROXY_PATH = '/api/run/piston'

const PISTON_VERSIONS: Record<'java' | 'csharp', string> = {
  java: '15.0.2',
  csharp: '6.12.0',
}
const PISTON_LANG: Record<'java' | 'csharp', string> = {
  java: 'java',
  csharp: 'csharp',
}

/* ============================================================ *
 *  JavaScript  (Web Worker)
 * ============================================================ */

/**
 * Web Worker 안에서 돌아가는 JS 실행 본체.
 * - 전역 'input' 으로 stdin 전체가 전달됨
 * - process.stdout.write / process.stderr.write 만 간단히 지원 (함수 래퍼가 사용)
 * - require('fs').readFileSync(0,'utf8') 등 전통적 Node 관용구도 동작하도록 얕은 셰임 유지
 */
const JS_WORKER_SRC = `
self.onmessage = async (e) => {
  const { code, stdin } = e.data;
  const logs = [];
  const errs = [];
  const stdoutBuf = [];
  const stderrBuf = [];

  const origLog = console.log;
  const origErr = console.error;
  console.log = (...args) => logs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
  console.error = (...args) => errs.push(args.map(a => String(a)).join(' '));

  const makeWritable = (buf) => ({
    write: (chunk) => { buf.push(String(chunk)); return true; },
    end: (chunk) => { if (chunk != null) buf.push(String(chunk)); return true; },
    on: () => makeWritable(buf),
    once: () => makeWritable(buf),
    setDefaultEncoding: () => {},
  });

  const processShim = {
    stdin: { isTTY: false, read: () => stdin, on: () => processShim.stdin, once: () => processShim.stdin, resume: () => processShim.stdin, setEncoding: () => processShim.stdin },
    stdout: makeWritable(stdoutBuf),
    stderr: makeWritable(stderrBuf),
    argv: ['node', 'main.js'],
    env: {},
    platform: 'browser',
    exit: (code) => { throw new Error('__PROCESS_EXIT__:' + (code ?? 0)); },
  };

  const requireShim = (name) => {
    if (name === 'fs') {
      return {
        readFileSync: (pathOrFd) => {
          if (pathOrFd === 0 || pathOrFd === '/dev/stdin' || pathOrFd === '/dev/fd/0') return stdin;
          throw new Error("브라우저 샌드박스에서는 파일 시스템 접근이 불가합니다: " + pathOrFd);
        },
      };
    }
    if (name === 'readline') {
      return {
        createInterface: () => {
          const lines = String(stdin).replace(/\\r\\n/g, '\\n').split('\\n');
          if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
          const listeners = { line: [], close: [] };
          const iface = {
            on: (event, cb) => { if (listeners[event]) listeners[event].push(cb); return iface; },
            once: (event, cb) => iface.on(event, cb),
            close: () => listeners.close.forEach(c => c()),
          };
          queueMicrotask(() => {
            for (const ln of lines) listeners.line.forEach(cb => cb(ln));
            listeners.close.forEach(cb => cb());
          });
          return iface;
        },
      };
    }
    throw new Error("require('" + name + "') 는 브라우저에서 지원되지 않습니다.");
  };

  const t0 = performance.now();
  try {
    const fn = new Function(
      'input', 'process', 'require',
      \`"use strict"; return (async () => { \${code} })();\`
    );
    await fn(stdin, processShim, requireShim);
  } catch (err) {
    const msg = err && err.message ? String(err.message) : String(err);
    if (!msg.startsWith('__PROCESS_EXIT__:')) {
      errs.push(err && err.stack ? err.stack : String(err));
    }
  }
  const t1 = performance.now();

  console.log = origLog;
  console.error = origErr;

  const stdoutStr = [logs.join('\\n'), stdoutBuf.join('')].filter(s => s.length > 0).join('');
  const stderrStr = [errs.join('\\n'), stderrBuf.join('')].filter(s => s.length > 0).join('');

  self.postMessage({ stdout: stdoutStr, stderr: stderrStr, timeMs: t1 - t0, timedOut: false });
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

/* ============================================================ *
 *  Python (Pyodide)
 * ============================================================ */

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

/* ============================================================ *
 *  Piston (Java, C#)
 * ============================================================ */

interface PistonResponse {
  compile?: { stdout: string; stderr: string }
  run?: { stdout: string; stderr: string; signal: string | null }
}

interface PistonProxyErrorBody {
  error?: string
  hint?: string
  raw?: string
}

interface LocalRunResponse {
  stdout: string
  stderr: string
  timeMs: number
  timedOut: boolean
}

interface LocalRunError {
  error?: string
  hint?: string
}

async function tryRunLocal(
  language: 'java' | 'csharp',
  code: string,
  stdin: string,
): Promise<ExecutionResult | null> {
  const t0 = performance.now()
  let resp: Response
  try {
    resp = await fetch(LOCAL_RUN_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language, code, stdin, timeoutMs: 8_000 }),
    })
  } catch {
    return null
  }
  if (resp.status === 503) return null
  if (!resp.ok) {
    let body: LocalRunError | null = null
    try {
      body = (await resp.json()) as LocalRunError
    } catch {
      body = { error: await resp.text() }
    }
    return {
      stdout: '',
      stderr: [body?.error ?? `로컬 실행 오류 (${resp.status})`, body?.hint ?? '']
        .filter(Boolean)
        .join('\n'),
      timeMs: performance.now() - t0,
      timedOut: false,
    }
  }
  const data = (await resp.json()) as LocalRunResponse
  return {
    stdout: data.stdout ?? '',
    stderr: data.stderr ?? '',
    timeMs: data.timeMs ?? performance.now() - t0,
    timedOut: !!data.timedOut,
  }
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
      body: JSON.stringify({ url: pistonUrl || undefined, payload }),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      stdout: '',
      stderr: `네트워크 오류: ${msg}`,
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
    return { stdout: '', stderr: lines.join('\n\n'), timeMs: t1 - t0, timedOut: false }
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

/* ============================================================ *
 *  Dispatcher — 원시 실행
 * ============================================================ */

export interface RunCodeOptions {
  pistonUrl?: string
  forcePiston?: boolean
}

export async function runRaw(
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
    case 'csharp': {
      if (!opts.forcePiston) {
        const local = await tryRunLocal(language, code, stdin)
        if (local) return local
      }
      return runPiston(language, code, stdin, opts.pistonUrl ?? '')
    }
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

/* ============================================================ *
 *  Dispatcher — 함수 스타일 실행 (프로그래머스식)
 * ============================================================ */

export interface SolutionRunResult extends ExecutionResult {
  /** 파싱된 반환값. 마커를 못 찾았으면 undefined. */
  returnValue: unknown
  /** 반환값 마커를 성공적으로 찾아 파싱했는지. */
  hasReturn: boolean
  /** 마커를 제거한 나머지 stdout (사용자가 직접 찍은 디버그 출력). */
  userStdout: string
}

/**
 * 사용자 코드를 시그니처에 맞는 래퍼로 감싸서 실행합니다.
 * 반환값은 stdout 의 마커 (\x1e__RESULT__:JSON:__END__\x1e) 를 통해 복원됩니다.
 */
export async function runSolution(
  language: Language,
  userCode: string,
  args: unknown[],
  signature: FunctionSignature,
  opts: RunCodeOptions = {},
): Promise<SolutionRunResult> {
  const wrapped = wrapForExecution(signature, userCode, language)
  const stdin = encodeArgsToStdin(args)
  const raw = await runRaw(language, wrapped, stdin, opts)
  const { value, found, leftover } = extractResult(raw.stdout)
  return {
    ...raw,
    stdout: raw.stdout,
    userStdout: leftover,
    returnValue: value,
    hasReturn: found,
  }
}

/* ============================================================ *
 *  Helpers
 * ============================================================ */

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
