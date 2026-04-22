export type Language = 'javascript' | 'python' | 'java' | 'csharp'

export type Difficulty = 'trivial' | 'easy' | 'medium' | 'hard'

export type ProblemSource = 'builtin' | 'ai'

/**
 * 프로그래머스 스타일 함수 시그니처용 범용 타입 코드.
 * 각 언어로 매핑되어 실행 래퍼가 타입 변환을 처리합니다.
 */
export type ParamType =
  | 'int'
  | 'long'
  | 'double'
  | 'string'
  | 'bool'
  | 'int[]'
  | 'long[]'
  | 'double[]'
  | 'string[]'
  | 'bool[]'

export interface Param {
  name: string
  type: ParamType
  description?: string
}

export interface FunctionSignature {
  /** 함수 이름. 기본값은 'solution'. */
  functionName: string
  params: Param[]
  returnType: ParamType
}

/**
 * 프로그래머스 스타일 함수 테스트 케이스.
 * args 는 signature.params 와 같은 순서/길이여야 합니다.
 */
export interface FunctionTestCase {
  name: string
  args: unknown[]
  expected: unknown
}

export type StarterCodes = Record<Language, string>

export type SolutionKind = 'standard' | 'concise' | 'optimized'

export interface Solution {
  kind: SolutionKind
  title: string
  description?: string
  /** 각 언어별 solution 함수 **본문 포함 전체 정의** (프로그래머스처럼 함수 하나). */
  code: StarterCodes
}

export interface Problem {
  id: string
  title: string
  difficulty: Difficulty
  description: string
  /** 함수 시그니처 — 모든 실행 · 표시는 이 정보를 중심으로 동작합니다. */
  signature: FunctionSignature
  /** 공개 예제 (2~3개) */
  samples: FunctionTestCase[]
  /** 히든 테스트 */
  hidden: FunctionTestCase[]
  /**
   * 에디터에 처음 로드되는 **함수 스켈레톤**.
   * signature 기반으로 본체가 비어 있는 함수 하나만 포함합니다.
   */
  starter: StarterCodes
  /** "답 보기" 버튼으로 공개되는 풀이들 (0~3개). */
  solutions?: Solution[]
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
  /** 한 번에 생성할 문제 개수 (1~10). */
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
  /** 함수 실행 모드에서 파싱된 반환값. null 일 수 있음. */
  returnValue?: unknown
}

export type CaseStatus = 'pass' | 'fail' | 'error' | 'running'

/**
 * 하나의 테스트 케이스 실행 결과.
 * - args / expected / actual 은 사람이 읽기 좋은 문자열 표현도 같이 저장.
 */
export interface CaseResult {
  name: string
  /** 입력 인자들 (args) 의 문자열 표현. 예: "solution(5, 7)" 또는 "5, 7" */
  argsDisplay: string
  /** 기대 반환값의 문자열 표현. */
  expectedDisplay: string
  /** 실제 반환값의 문자열 표현. */
  actualDisplay: string
  /** 사용자가 호출 중에 직접 찍은 stderr. */
  stderr: string
  timeMs: number
  status: CaseStatus
}

export type SummaryKind = 'pass' | 'fail' | 'error'

export interface RunSummary {
  kind: SummaryKind
  message: string
}
