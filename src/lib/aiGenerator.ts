import { chatJSON } from './openai'
import type {
  Difficulty,
  GenerateRequest,
  OpenAISettings,
  Problem,
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

const PROBLEM_SCHEMA = {
  name: 'coding_problem',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'difficulty', 'description', 'sampleTests', 'hiddenTests', 'starter'],
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
        type: 'object',
        additionalProperties: false,
        required: ['javascript', 'python', 'java', 'csharp'],
        description:
          '각 언어별 "정답이 되는" 시작 코드. 표준 입출력 기반이어야 하며, 실행하면 모든 테스트 케이스를 통과해야 함.',
        properties: {
          javascript: {
            type: 'string',
            description:
              "브라우저 Web Worker에서 실행됨. 'input' 이라는 문자열 변수에 stdin 전체가 들어 있음. console.log 로 출력.",
          },
          python: {
            type: 'string',
            description: "Pyodide에서 실행됨. input() 또는 sys.stdin 사용 가능.",
          },
          java: {
            type: 'string',
            description: "public class Main { ... } 형식. Scanner 등으로 System.in 처리.",
          },
          csharp: {
            type: 'string',
            description: "class Program { static void Main() { ... } } 형식. Console 사용.",
          },
        },
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
    "javascript": string,
    "python": string,
    "java": string,
    "csharp": string
  }
}

반드시 지켜야 할 규칙:
1. 모든 문제는 표준 입력(stdin)을 읽고 표준 출력(stdout)으로 답을 출력하는 방식입니다.
2. 입력 형식과 출력 형식을 description 에 한국어로 명확히 기술하세요.
3. stdin은 입력이 끝날 때 "\\n" 을 포함할 수 있습니다. expected 는 trailing newline 없이 정답 그대로.
4. 스타터 코드는 반드시 **실제로 실행했을 때 모든 테스트를 통과하는 "참조 풀이"** 여야 합니다. TODO 주석만 남기지 마세요.
5. JavaScript 코드는 전역 'input' 문자열 변수로 stdin 전체가 주입됩니다. (console.log 로 출력)
6. Java 는 'public class Main', C# 은 'class Program' + 'static void Main()'.
7. expected 는 프로그램 stdout 을 trim 한 결과와 정확히 일치해야 합니다.
8. 답이 여러 개일 수 있는 문제(순서 무관 등)는 피하고, 항상 하나의 정답만 나오도록 설계하세요.
9. 난이도 기준: easy(기초 반복/조건/수식), medium(자료구조/간단한 알고리즘), hard(그래프/DP/고급 알고리즘).
10. JSON 외 다른 텍스트는 절대 출력하지 마세요.`

function buildUserPrompt(req: GenerateRequest): string {
  const diffLabel = { easy: '쉬움', medium: '보통', hard: '어려움' }[req.difficulty]
  return `아래 명세에 맞게 코딩테스트 문제를 1개 만들어주세요.

- 주제: ${req.topic || '(자유)'}
- 난이도: ${diffLabel}
- 히든 테스트 개수: ${req.hiddenTestCount}개
- 추가 제약 / 요구사항: ${req.constraints || '(없음)'}

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
  throw new Error(`스타터 코드에 '${aliases[0]}' 필드가 없습니다.`)
}

function validateStarter(obj: unknown): StarterCodes {
  if (!obj || typeof obj !== 'object') throw new Error("'starter' 가 객체가 아닙니다.")
  const s = obj as Record<string, unknown>
  return {
    javascript: coerceLang(s, 'javascript', 'js'),
    python: coerceLang(s, 'python', 'py'),
    java: coerceLang(s, 'java'),
    csharp: coerceLang(s, 'csharp', 'cs', 'c#', 'c_sharp'),
  }
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
  const starterRaw = pickFirst(p, [
    'starter',
    'starter_code',
    'starterCode',
    'starters',
    'solutions',
    'reference_solutions',
    'referenceSolutions',
  ])

  return {
    id: slugify(title),
    title,
    difficulty: coerceDifficulty(pickFirst(p, ['difficulty', 'level'])),
    description,
    sampleTests: validateTests(sampleTestsRaw, 'sampleTests'),
    hiddenTests: validateTests(hiddenTestsRaw ?? [], 'hiddenTests'),
    starter: validateStarter(starterRaw),
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
