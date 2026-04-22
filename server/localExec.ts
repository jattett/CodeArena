import { spawn, type SpawnOptions } from 'node:child_process'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { Request, Response } from 'express'

/**
 * 로컬 툴체인 기반 코드 실행기 (Java / C#).
 *
 * - 사용자 개발 머신에 이미 설치된 `javac`/`java`/`dotnet` 을 사용하므로
 *   Docker 나 외부 API 없이 바로 Java/C# 코드를 실행할 수 있습니다.
 * - 자식 프로세스 타임아웃 + stdout/stderr 캡처 + 임시 디렉터리 정리.
 * - 설치 여부는 서버 시작 시 `which` 로 탐지해 /api/health 에 노출.
 */

export type LocalLang = 'java' | 'csharp'

interface ToolchainStatus {
  java: { available: boolean; path?: string }
  csharp: { available: boolean; path?: string }
}

let detected: ToolchainStatus = {
  java: { available: false },
  csharp: { available: false },
}

async function which(cmd: string): Promise<string | null> {
  return await new Promise((resolve) => {
    const p = spawn('which', [cmd], { stdio: ['ignore', 'pipe', 'ignore'] })
    let out = ''
    p.stdout.on('data', (chunk) => {
      out += chunk.toString()
    })
    p.on('close', (code) => {
      resolve(code === 0 ? out.trim().split('\n')[0] : null)
    })
    p.on('error', () => resolve(null))
  })
}

export async function detectToolchains(): Promise<ToolchainStatus> {
  const [javac, dotnet] = await Promise.all([which('javac'), which('dotnet')])
  detected = {
    java: { available: !!javac, path: javac ?? undefined },
    csharp: { available: !!dotnet, path: dotnet ?? undefined },
  }
  return detected
}

export function getToolchainStatus(): ToolchainStatus {
  return detected
}

interface ProcResult {
  stdout: string
  stderr: string
  code: number | null
  timedOut: boolean
}

function runProc(
  cmd: string,
  args: string[],
  opts: SpawnOptions & { stdin?: string; timeoutMs?: number } = {},
): Promise<ProcResult> {
  return new Promise((resolve) => {
    const { stdin = '', timeoutMs = 10_000, ...rest } = opts
    const child = spawn(cmd, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      ...rest,
    })
    let out = ''
    let err = ''
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
    }, timeoutMs)
    child.stdout?.on('data', (c) => (out += c.toString()))
    child.stderr?.on('data', (c) => (err += c.toString()))
    child.on('error', (e) => {
      clearTimeout(timer)
      resolve({ stdout: out, stderr: err + String(e), code: -1, timedOut })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ stdout: out, stderr: err, code, timedOut })
    })
    if (stdin) {
      child.stdin?.write(stdin)
    }
    child.stdin?.end()
  })
}

async function mkTempDir(prefix: string): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), `codearena-${prefix}-`))
}

async function cleanup(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true })
  } catch {
    /* noop */
  }
}

/* ----------------- Java ----------------- */

async function runJavaLocal(
  code: string,
  stdin: string,
  timeoutMs: number,
): Promise<{ stdout: string; stderr: string; timeMs: number; timedOut: boolean }> {
  const dir = await mkTempDir('java')
  try {
    const src = path.join(dir, 'Main.java')
    await fs.writeFile(src, code, 'utf8')

    const t0 = Date.now()
    const compile = await runProc('javac', ['-d', dir, src], { timeoutMs: 15_000 })
    if (compile.code !== 0) {
      return {
        stdout: '',
        stderr: `[compile error]\n${compile.stderr || compile.stdout}`,
        timeMs: Date.now() - t0,
        timedOut: compile.timedOut,
      }
    }
    const run = await runProc('java', ['-cp', dir, 'Main'], { stdin, timeoutMs })
    return {
      stdout: run.stdout,
      stderr: run.stderr,
      timeMs: Date.now() - t0,
      timedOut: run.timedOut,
    }
  } finally {
    await cleanup(dir)
  }
}

/* ----------------- C# (dotnet run --project with stdin) ----------------- */

/**
 * dotnet-script 가 없는 환경을 고려해 임시 콘솔 프로젝트를 즉석에서 만들고 실행합니다.
 * 첫 실행은 NuGet 복원 때문에 다소 느릴 수 있어 timeout 을 넉넉하게 둡니다.
 */
async function runCSharpLocal(
  code: string,
  stdin: string,
  timeoutMs: number,
): Promise<{ stdout: string; stderr: string; timeMs: number; timedOut: boolean }> {
  const dir = await mkTempDir('cs')
  try {
    const t0 = Date.now()
    const init = await runProc(
      'dotnet',
      ['new', 'console', '-o', dir, '--force', '--no-restore'],
      { timeoutMs: 30_000 },
    )
    if (init.code !== 0) {
      return {
        stdout: '',
        stderr: `[dotnet new error]\n${init.stderr || init.stdout}`,
        timeMs: Date.now() - t0,
        timedOut: init.timedOut,
      }
    }
    await fs.writeFile(path.join(dir, 'Program.cs'), code, 'utf8')

    const run = await runProc(
      'dotnet',
      ['run', '--project', dir, '-c', 'Release', '--nologo'],
      { stdin, timeoutMs: Math.max(timeoutMs, 60_000) },
    )
    return {
      stdout: run.stdout,
      stderr: run.stderr,
      timeMs: Date.now() - t0,
      timedOut: run.timedOut,
    }
  } finally {
    await cleanup(dir)
  }
}

/* ----------------- Express handler ----------------- */

interface LocalRunBody {
  language: LocalLang
  code: string
  stdin?: string
  timeoutMs?: number
}

export async function handleLocalRun(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as Partial<LocalRunBody>
  const language = body.language
  const code = body.code ?? ''
  const stdin = body.stdin ?? ''
  const timeoutMs = Math.min(Math.max(body.timeoutMs ?? 8_000, 1_000), 60_000)

  if (language !== 'java' && language !== 'csharp') {
    res.status(400).json({ error: "language 는 'java' | 'csharp' 중 하나여야 합니다." })
    return
  }
  if (!code.trim()) {
    res.status(400).json({ error: 'code 가 비어 있습니다.' })
    return
  }

  const status = detected
  if (language === 'java' && !status.java.available) {
    res.status(503).json({
      error: 'javac/java 가 설치되어 있지 않거나 PATH 에 없습니다.',
      hint: 'Homebrew: brew install openjdk  (설치 후 터미널 재시작)',
    })
    return
  }
  if (language === 'csharp' && !status.csharp.available) {
    res.status(503).json({
      error: 'dotnet SDK 가 설치되어 있지 않거나 PATH 에 없습니다.',
      hint: 'Homebrew: brew install --cask dotnet-sdk  (설치 후 터미널 재시작)',
    })
    return
  }

  try {
    const result =
      language === 'java'
        ? await runJavaLocal(code, stdin, timeoutMs)
        : await runCSharpLocal(code, stdin, timeoutMs)
    res.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    res.status(500).json({ error: `로컬 실행 실패: ${msg}` })
  }
}
