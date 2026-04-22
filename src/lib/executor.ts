import type { ExecutionResult, Language } from '../types'

/**
 * 언어별 코드 실행기
 * 모든 실행기는 ExecutionResult { stdout, stderr, timeMs, timedOut } 를 반환합니다.
 *
 * - JavaScript: Web Worker 샌드박스
 * - Python: Pyodide (브라우저 내 Python 런타임)
 * - Java / C#: 로컬 Express 백엔드가 순서대로 시도
 *     1) /api/run/local  — 시스템에 설치된 javac/java/dotnet 직접 실행 (권장)
 *     2) /api/run/piston — 사용자 지정 Piston 인스턴스 (polling fallback)
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

/* ---------- JavaScript (Web Worker) ---------- */

/**
 * Web Worker 안에서 실행되는 JavaScript 코드.
 *
 * 기본 관례:
 *   - 전역 'input' 문자열 변수로 stdin 전체가 주입됩니다.
 *   - console.log 로 출력합니다.
 *
 * Node.js 호환 셰임:
 *   코딩 테스트 사이트(백준/프로그래머스 등)의 관용 문법이 그대로 동작하도록
 *   다음 API 를 흉내냅니다. (실제 Node.js 와 완전히 동일하지는 않음)
 *     - require('fs').readFileSync(0, 'utf8') / '/dev/stdin' / '/dev/fd/0'
 *     - require('readline').createInterface({...}) — 'line' / 'close' 이벤트
 *     - process.stdin.on('data' | 'end' | 'close', cb)
 *     - process.stdout.write(s) / process.stderr.write(s)
 *     - process.argv / process.env / process.exit()
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

  const makeStdin = () => {
    const listeners = { data: [], end: [], close: [] };
    let fired = false;
    const fire = () => {
      if (fired) return;
      fired = true;
      queueMicrotask(() => {
        listeners.data.forEach(cb => cb(stdin));
        listeners.end.forEach(cb => cb());
        listeners.close.forEach(cb => cb());
      });
    };
    const api = {
      isTTY: false,
      setEncoding: () => api,
      resume: () => { fire(); return api; },
      pause: () => api,
      read: () => stdin,
      on: (event, cb) => {
        if (listeners[event]) listeners[event].push(cb);
        if (event === 'data') fire();
        return api;
      },
      once: (event, cb) => api.on(event, cb),
      off: () => api,
    };
    return api;
  };

  const processShim = {
    stdin: makeStdin(),
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
          if (pathOrFd === 0 || pathOrFd === '/dev/stdin' || pathOrFd === '/dev/fd/0') {
            return stdin;
          }
          throw new Error("브라우저 샌드박스에서는 파일 시스템 접근이 불가합니다: " + pathOrFd);
        },
        readFile: (pathOrFd, _encOrCb, maybeCb) => {
          const cb = typeof _encOrCb === 'function' ? _encOrCb : maybeCb;
          queueMicrotask(() => cb(null, stdin));
        },
      };
    }
    if (name === 'readline') {
      return {
        createInterface: () => {
          const lines = stdin.replace(/\\r\\n/g, '\\n').split('\\n');
          // 관례적으로 trailing '' 는 제거 (코드상 'line' 이벤트로 빈 줄 받는 문제 방지)
          if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
          const listeners = { line: [], close: [] };
          const iface = {
            on: (event, cb) => {
              if (listeners[event]) listeners[event].push(cb);
              return iface;
            },
            once: (event, cb) => iface.on(event, cb),
            close: () => listeners.close.forEach(c => c()),
            question: (_q, cb) => cb(lines.shift() ?? ''),
          };
          queueMicrotask(() => {
            for (const ln of lines) listeners.line.forEach(cb => cb(ln));
            listeners.close.forEach(cb => cb());
          });
          return iface;
        },
      };
    }
    throw new Error("require('" + name + "') 는 브라우저 샌드박스에서 지원되지 않습니다. 전역 'input' 변수를 사용하세요.");
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
    // process.exit() 호출은 정상 종료로 간주 — stderr 에 남기지 않음.
    if (!msg.startsWith('__PROCESS_EXIT__:')) {
      errs.push(err && err.stack ? err.stack : String(err));
    }
  }
  const t1 = performance.now();

  console.log = origLog;
  console.error = origErr;

  // console.log 결과와 process.stdout.write 결과를 합친다.
  // 보통 사용자는 둘 중 한 가지만 쓰므로 단순 연결로 충분.
  const stdoutStr = [logs.join('\\n'), stdoutBuf.join('')]
    .filter(s => s.length > 0)
    .join('');
  const stderrStr = [errs.join('\\n'), stderrBuf.join('')]
    .filter(s => s.length > 0)
    .join('');

  self.postMessage({
    stdout: stdoutStr,
    stderr: stderrStr,
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

/**
 * 백엔드 로컬 실행 시도. 503 (toolchain 미설치) 이면 null 을 돌려
 * 상위에서 Piston 으로 폴백할 수 있도록 한다.
 */
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
    // 백엔드 자체가 꺼진 경우 — Piston 폴백도 의미없지만 일단 null 반환
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
  /** 사용자 설정 Piston URL (로컬 툴체인이 없을 때의 폴백). */
  pistonUrl?: string
  /** 로컬 툴체인 시도를 건너뛰고 바로 Piston 사용 */
  forcePiston?: boolean
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
