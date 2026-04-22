export type Language = 'javascript' | 'python' | 'java' | 'csharp'

export type Difficulty = 'easy' | 'medium' | 'hard'

export type ProblemSource = 'builtin' | 'ai'

export interface TestCase {
  name: string
  stdin: string
  expected: string
}

export type StarterCodes = Record<Language, string>

export interface Problem {
  id: string
  title: string
  difficulty: Difficulty
  description: string
  sampleTests: TestCase[]
  hiddenTests: TestCase[]
  starter: StarterCodes
  source?: ProblemSource
  createdAt?: number
}

export type AuthMode = 'apikey' | 'oauth'

export interface OpenAISettings {
  authMode: AuthMode
  apiKey: string
  model: string
  /**
   * Java / C# 실행에 사용할 Piston API URL.
   * 빈 문자열이면 로컬 백엔드의 기본값 사용.
   * 예시: http://localhost:2000/api/v2/piston/execute (자체 호스팅)
   *       https://emkc.org/api/v2/piston/execute (2026-02-15 부터 whitelist only)
   */
  pistonUrl: string
}

export interface AuthStatus {
  loggedIn: boolean
  accountId?: string | null
  expiresAt?: number
  tokenType?: string
}

export interface GenerateRequest {
  topic: string
  difficulty: Difficulty
  constraints: string
  hiddenTestCount: number
  /** 한 번에 생성할 문제 개수 (1~10). 내부적으로 N번 호출됩니다. */
  problemCount: number
}

export interface LanguageDef {
  id: Language
  label: string
  ext: string
}

export interface ExecutionResult {
  stdout: string
  stderr: string
  timeMs: number
  timedOut: boolean
}

export type CaseStatus = 'pass' | 'fail' | 'error' | 'running'

export interface CaseResult {
  name: string
  stdin: string
  expected: string
  actual: string
  stderr: string
  timeMs: number
  status: CaseStatus
}

export type SummaryKind = 'pass' | 'fail' | 'error'

export interface RunSummary {
  kind: SummaryKind
  message: string
}
