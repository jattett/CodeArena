import { chatJSON } from './openai'
import { defaultSkeletonAll } from './skeleton'
import type {
  Difficulty,
  GenerateRequest,
  OpenAISettings,
  Problem,
  Solution,
  SolutionKind,
  StarterCodes,
  TestCase,
} from '../types'

// Codex OAuth 백엔드는 response_format.json_schema 를 "강제"하지 않고 힌트로만 사용합니다.
// 따라서 모델이 snake_case 나 다른 키 이름을 반환해도 받아들일 수 있는 관대한 파서가 필요합니다.

/* ---------- JSON Schema ---------- */

const TEST_ITEM_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'stdin', 'expected'],
  properties: {
    name: { type: 'string' },
    stdin: { type: 'string', description: '표준 입력 (줄바꿈 포함 가능)' },
    expected: { type: 'string', description: '기대 출력 (trailing newline 제외)' },
  },
} as const

const CODE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['javascript', 'python', 'java', 'csharp'],
  properties: {
    javascript: { type: 'string' },
    python: { type: 'string' },
    java: { type: 'string' },
    csharp: { type: 'string' },
  },
} as const

const SOLUTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'title', 'code'],
  properties: {
    kind: { type: 'string', enum: ['standard', 'concise', 'optimized'] },
    title: { type: 'string', description: '짧은 한국어 풀이 제목 (20자 이내)' },
    description: { type: 'string', description: '이 풀이의 핵심 아이디어 한 줄' },
    code: CODE_SCHEMA,
  },
} as const

const PROBLEM_SCHEMA = {
  name: 'coding_problem',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'difficulty', 'description', 'sampleTests', 'hiddenTests', 'starter', 'solutions'],
    properties: {
      title: { type: 'string', description: '한국어로 된 문제 제목 (20자 이내)' },
      difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
      description: {
        type: 'string',
        description: '한국어 문제 설명. 입력/출력 형식과 제약조건을 포함할 것.',
      },
      sampleTests: {
        type: 'array',
        description: '공개 예제 테스트 (2~3개)',
        minItems: 2,
        maxItems: 3,
        items: TEST_ITEM_SCHEMA,
      },
      hiddenTests: {
        type: 'array',
        description: '히든 테스트 케이스',
        items: TEST_ITEM_SCHEMA,
      },
      starter: {
        ...CODE_SCHEMA,
        description:
          '**정답이 없는 스켈레톤 코드**. stdin 읽기 + TODO 주석만 포함. 실제 풀이 로직은 절대 포함하지 말 것.',
      },
      solutions: {
        type: 'array',
        description: '서로 다른 접근의 참조 풀이 3개.',
        minItems: 3,
        maxItems: 3,
        items: SOLUTION_SCHEMA,
      },
    },
  },
} as const

/* ---------- Prompt ---------- */

const SYSTEM_PROMPT = `당신은 코딩테스트 출제 전문가입니다.
당신의 역할은 주어진 주제/난이도/제약조건에 맞춰 명확하고 정확한 알고리즘 문제를 만드는 것입니다.

반드시 **아래 정확한 JSON 스키마**로만 응답하세요 (snake_case 금지, 추가 필드 금지):

{
  "title": string,
  "difficulty": "easy" | "medium" | "hard",
  "description": string,
  "sampleTests": [ { "name": string, "stdin": string, "expected": string }, ... ],   // 2~3개
  "hiddenTests": [ { "name": string, "stdin": string, "expected": string }, ... ],   // 요청된 개수
  "starter": {
    "javascript": string,  // 정답 없는 스켈레톤 (TODO 주석만)
    "python": string,
    "java": string,
    "csharp": string
  },
  "solutions": [
    {
      "kind": "standard" | "concise" | "optimized",
      "title": string,           // 한국어 풀이 제목
      "description": string,     // 아이디어 한 줄
      "code": {
        "javascript": string,
        "python": string,
        "java": string,
        "csharp": string
      }
    },
    ...  // 정확히 3개
  ]
}

반드시 지켜야 할 규칙:
1. 모든 문제는 표준 입력(stdin)을 읽고 표준 출력(stdout)으로 답을 출력하는 방식입니다.
2. 입력 형식과 출력 형식을 description 에 한국어로 명확히 기술하세요.
3. stdin은 입력이 끝날 때 "\\n" 을 포함할 수 있습니다. expected 는 trailing newline 없이 정답 그대로.
4. **starter 는 정답이 아닌 스켈레톤** 이어야 합니다. stdin 을 읽는 최소한의 틀 + "// TODO" 주석만 넣고, 핵심 풀이 로직은 절대 포함하지 마세요. 최종 출력 자리에는 빈 문자열(예: console.log(''); / print(''))을 남겨 두세요.
5. **solutions 는 정확히 3개**, 서로 다른 접근이어야 합니다:
   - kind="standard"  : 가장 직관적인 기본 풀이
   - kind="concise"   : 내장 함수/한 줄로 간결하게 쓴 풀이
   - kind="optimized" : 성능 개선 / 다른 알고리즘 / 큰 입력 대응 풀이
6. solutions 안의 code 는 반드시 **실제로 실행했을 때 모든 테스트 케이스를 통과하는 완성 코드** 여야 합니다.
7. JavaScript 코드는 전역 'input' 문자열 변수로 stdin 전체가 주입됩니다. (console.log 로 출력)
8. Java 는 'public class Main', C# 은 'class Program' + 'static void Main()'.
9. expected 는 프로그램 stdout 을 trim 한 결과와 정확히 일치해야 합니다.
10. 답이 여러 개일 수 있는 문제(순서 무관 등)는 피하고, 항상 하나의 정답만 나오도록 설계하세요.
11. JSON 외 다른 텍스트는 절대 출력하지 마세요.`

function buildUserPrompt(req: GenerateRequest): string {
  const diffLabel = { easy: '쉬움', medium: '보통', hard: '어려움' }[req.difficulty]
  return `아래 명세에 맞게 코딩테스트 문제를 1개 만들어주세요.

- 주제: ${req.topic || '(자유)'}
- 난이도: ${diffLabel}
- 히든 테스트 개수: ${req.hiddenTestCount}개
- 추가 제약 / 요구사항: ${req.constraints || '(없음)'}

다시 한 번 강조합니다:
- starter 는 **정답이 없는 빈 껍데기** 여야 합니다.
- solutions 는 **기본/간결/최적화 3개**, 모두 실행 시 정답을 내는 완성 코드여야 합니다.

스스로 풀이를 시뮬레이션하고 네 언어 모두에서 실제로 정답이 나오는지 검증한 뒤 반환하세요.`
}

/* ---------- Utilities ---------- */

function slugify(s: string): string {
  const base = s
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  const rand = Math.random().toString(36).slice(2, 6)
  return `ai-${base || 'problem'}-${rand}`
}

function pickFirst(obj: Record<string, unknown>, keys: readonly string[]): unknown {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k]
  }
  return undefined
}

function validateTests(list: unknown, field: string): TestCase[] {
  if (!Array.isArray(list)) throw new Error(`'${field}' 는 배열이어야 합니다.`)
  return list.map((raw, i): TestCase => {
    const t = (raw ?? {}) as Record<string, unknown>
    const stdin = pickFirst(t, ['stdin', 'input', 'in'])
    const expected = pickFirst(t, ['expected', 'output', 'out', 'answer'])
    const name = pickFirst(t, ['name', 'title']) ?? `${field} #${i + 1}`
    if (typeof stdin !== 'string') {
      throw new Error(`'${field}[${i}]' 에 stdin/input 필드가 없습니다.`)
    }
    if (typeof expected !== 'string') {
      throw new Error(`'${field}[${i}]' 에 expected/output 필드가 없습니다.`)
    }
    return {
      name: typeof name === 'string' ? name : `${field} #${i + 1}`,
      stdin,
      expected,
    }
  })
}

function coerceLang(obj: Record<string, unknown>, ...aliases: string[]): string {
  const v = pickFirst(obj, aliases)
  if (typeof v === 'string') return v
  throw new Error(`코드 블록에 '${aliases[0]}' 필드가 없습니다.`)
}

function validateCodeMap(obj: unknown, fieldName: string): StarterCodes {
  if (!obj || typeof obj !== 'object') {
    throw new Error(`'${fieldName}' 가 객체가 아닙니다.`)
  }
  const s = obj as Record<string, unknown>
  return {
    javascript: coerceLang(s, 'javascript', 'js'),
    python: coerceLang(s, 'python', 'py'),
    java: coerceLang(s, 'java'),
    csharp: coerceLang(s, 'csharp', 'cs', 'c#', 'c_sharp'),
  }
}

function coerceKind(v: unknown, fallback: SolutionKind): SolutionKind {
  const s = String(v ?? '').trim().toLowerCase()
  if (s === 'standard' || s === 'basic' || s === 'default' || s === 'base') return 'standard'
  if (s === 'concise' || s === 'short' || s === 'oneliner' || s === 'one-liner') return 'concise'
  if (s === 'optimized' || s === 'optimal' || s === 'fast' || s === 'efficient') return 'optimized'
  return fallback
}

function normalizeSolutions(raw: unknown, fallbackCode: StarterCodes): Solution[] {
  const KINDS_FALLBACK: SolutionKind[] = ['standard', 'concise', 'optimized']

  if (!Array.isArray(raw) || raw.length === 0) {
    return [
      {
        kind: 'standard',
        title: '참조 풀이',
        description: 'AI 가 생성한 참조 풀이입니다.',
        code: fallbackCode,
      },
    ]
  }

  return raw.slice(0, 3).map((item, idx): Solution => {
    const o = (item ?? {}) as Record<string, unknown>
    const kind = coerceKind(o.kind, KINDS_FALLBACK[idx] ?? 'standard')
    const title =
      (typeof o.title === 'string' && o.title.trim()) ||
      (kind === 'standard' ? '기본 풀이' : kind === 'concise' ? '간결한 풀이' : '최적화 풀이')
    const description =
      typeof o.description === 'string'
        ? o.description
        : typeof o.summary === 'string'
          ? o.summary
          : undefined
    const codeRaw = pickFirst(o, ['code', 'solution', 'starter', 'source'])
    const code = validateCodeMap(codeRaw, `solutions[${idx}].code`)
    return { kind, title, description, code }
  })
}

function coerceDifficulty(v: unknown): Difficulty {
  const s = String(v ?? '').trim().toLowerCase()
  if (s === 'easy' || s === '쉬움' || s === 'low') return 'easy'
  if (s === 'medium' || s === '보통' || s === 'mid' || s === 'normal') return 'medium'
  if (s === 'hard' || s === '어려움' || s === 'high') return 'hard'
  return 'medium'
}

/**
 * 모델이 camelCase / snake_case / 기타 변형을 섞어 내도 받아들이도록
 * 관대한 정규화 레이어. (Codex 백엔드는 response_format 을 강제하지 않음)
 */
function normalizeProblem(raw: unknown): Problem {
  if (!raw || typeof raw !== 'object') {
    throw new Error('AI 응답이 객체가 아닙니다.')
  }
  const p = raw as Record<string, unknown>

  const title = String(pickFirst(p, ['title', 'name']) ?? '').trim() || 'AI 생성 문제'
  const description = String(
    pickFirst(p, ['description', 'problem', 'statement', 'prompt']) ?? '',
  ).trim()

  const sampleTestsRaw = pickFirst(p, [
    'sampleTests',
    'sample_tests',
    'samples',
    'public_tests',
    'publicTests',
    'examples',
  ])
  const hiddenTestsRaw = pickFirst(p, [
    'hiddenTests',
    'hidden_tests',
    'hidden',
    'secret_tests',
    'secretTests',
    'private_tests',
    'privateTests',
  ])

  // starter 는 "스켈레톤" 이어야 함. 없거나 형식이 틀리면 기본 스켈레톤으로 대체.
  const starterRaw = pickFirst(p, ['starter', 'skeleton', 'boilerplate', 'template'])
  let starter: StarterCodes
  try {
    starter = starterRaw ? validateCodeMap(starterRaw, 'starter') : defaultSkeletonAll()
  } catch {
    starter = defaultSkeletonAll()
  }

  // 레거시: 예전 스키마에서는 starter 에 정답이 들어있었음.
  // 새 스키마에는 solutions 배열이 있음.
  const solutionsRaw = pickFirst(p, [
    'solutions',
    'reference_solutions',
    'referenceSolutions',
    'answers',
    'reference',
  ])

  // solutions 가 없고, 레거시 starter_code / solution_outline 이 있으면 그걸 하나의 풀이로 사용.
  const legacySolutionCode = pickFirst(p, ['starter_code', 'starterCode', 'reference_code'])
  const fallbackCode: StarterCodes = legacySolutionCode
    ? validateCodeMap(legacySolutionCode, 'legacy_solution')
    : // 만약 starterRaw 가 실제로 정답을 담고 있었다면(레거시) 그걸 풀이로 채택
      starterRaw && !solutionsRaw
      ? validateCodeMap(starterRaw, 'legacy_starter_as_solution')
      : starter

  const solutions = normalizeSolutions(solutionsRaw, fallbackCode)

  // 만약 레거시 경로로 starter 가 정답이었고 별도 스켈레톤이 없으면, 실제 에디터용 starter 는 기본 스켈레톤으로.
  if (!solutionsRaw && legacySolutionCode === undefined && starterRaw) {
    starter = defaultSkeletonAll()
  }

  return {
    id: slugify(title),
    title,
    difficulty: coerceDifficulty(pickFirst(p, ['difficulty', 'level'])),
    description,
    sampleTests: validateTests(sampleTestsRaw, 'sampleTests'),
    hiddenTests: validateTests(hiddenTestsRaw ?? [], 'hiddenTests'),
    starter,
    solutions,
    source: 'ai',
    createdAt: Date.now(),
  }
}

/* ---------- Public API ---------- */

export async function generateProblem(
  settings: OpenAISettings,
  req: GenerateRequest,
  signal?: AbortSignal,
): Promise<Problem> {
  const payload = await chatJSON<unknown>({
    settings,
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(req),
    schema: PROBLEM_SCHEMA as unknown as {
      name: string
      strict?: boolean
      schema: Record<string, unknown>
    },
    temperature: 0.8,
    signal,
  })
  return normalizeProblem(payload)
}
