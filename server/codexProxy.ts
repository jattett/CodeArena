import { spawn, type ChildProcess } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { AUTH_FILE } from './tokens.js'

/**
 * `openai-oauth` CLI 를 자식 프로세스로 관리합니다.
 *
 * - 로그인된 상태에서만 기동 (auth.json 파일이 필요)
 * - 포트 10531 에서 OpenAI 호환 HTTP 엔드포인트 제공
 * - 로그아웃 / refresh 실패 시 정상 종료
 */

export const CODEX_PROXY_PORT = 10531
export const CODEX_PROXY_URL = `http://127.0.0.1:${CODEX_PROXY_PORT}`

let child: ChildProcess | null = null
let starting = false
let readyResolvers: Array<(ok: boolean) => void> = []
let ready = false

function resolveCliPath(): string {
  // 패키지의 exports 가 subpath './dist/cli.js' 를 노출하지 않으므로
  // 파일 시스템에서 직접 경로를 찾아 실행합니다.
  const here = path.dirname(fileURLToPath(import.meta.url))
  const candidates = [
    path.resolve(here, '..', 'node_modules', 'openai-oauth', 'dist', 'cli.js'),
    path.resolve(process.cwd(), 'node_modules', 'openai-oauth', 'dist', 'cli.js'),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  throw new Error(
    `openai-oauth CLI 파일을 찾을 수 없습니다. 'npm install' 이 정상 완료됐는지 확인해주세요.`,
  )
}

function log(...args: unknown[]) {
  console.log('[codex-proxy]', ...args)
}

export function isRunning(): boolean {
  return !!child && !child.killed && ready
}

export function getStatus(): { running: boolean; pid: number | null; url: string } {
  return {
    running: isRunning(),
    pid: child?.pid ?? null,
    url: CODEX_PROXY_URL,
  }
}

export async function startCodexProxy(): Promise<boolean> {
  if (child && !child.killed) {
    return ready
  }
  if (starting) {
    return new Promise<boolean>((res) => readyResolvers.push(res))
  }

  starting = true
  ready = false
  const cliPath = resolveCliPath()
  log(`starting openai-oauth on ${CODEX_PROXY_URL} (auth=${AUTH_FILE})`)

  try {
    child = spawn(
      process.execPath,
      [
        cliPath,
        '--host',
        '127.0.0.1',
        '--port',
        String(CODEX_PROXY_PORT),
        '--oauth-file',
        AUTH_FILE,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    )
  } catch (err) {
    starting = false
    log('spawn failed:', err)
    return false
  }

  const resolveAll = (ok: boolean) => {
    ready = ok
    starting = false
    for (const r of readyResolvers) r(ok)
    readyResolvers = []
  }

  const onOut = (buf: Buffer) => {
    const s = buf.toString()
    process.stdout.write(`[codex-proxy] ${s}`)
    if (!ready && /ready|listening|http:\/\//i.test(s)) {
      resolveAll(true)
    }
  }
  const onErr = (buf: Buffer) => {
    const s = buf.toString()
    process.stderr.write(`[codex-proxy] ${s}`)
  }

  child.stdout?.on('data', onOut)
  child.stderr?.on('data', onErr)

  child.on('exit', (code, signal) => {
    log(`exited code=${code} signal=${signal}`)
    ready = false
    child = null
    resolveAll(false)
  })
  child.on('error', (err) => {
    log('error:', err.message)
  })

  // 출력에 ready 패턴이 안 오면 5초 뒤에 health check 로 판정
  const result = await Promise.race<boolean>([
    new Promise<boolean>((res) => readyResolvers.push(res)),
    new Promise<boolean>((res) => setTimeout(() => res(false), 10_000)),
  ])
  if (result) return true

  // 타임아웃 → health check
  const ok = await pingHealth()
  resolveAll(ok)
  return ok
}

export async function stopCodexProxy(): Promise<void> {
  if (!child) return
  log('stopping openai-oauth')
  const c = child
  child = null
  ready = false
  try {
    c.kill('SIGTERM')
  } catch {
    /* ignore */
  }
  await new Promise<void>((res) => {
    const t = setTimeout(() => {
      try {
        c.kill('SIGKILL')
      } catch {
        /* ignore */
      }
      res()
    }, 2000)
    c.on('exit', () => {
      clearTimeout(t)
      res()
    })
  })
}

export async function restartCodexProxy(): Promise<boolean> {
  await stopCodexProxy()
  return startCodexProxy()
}

async function pingHealth(): Promise<boolean> {
  try {
    const r = await fetch(`${CODEX_PROXY_URL}/v1/models`, { method: 'GET' })
    return r.status < 500
  } catch {
    return false
  }
}
