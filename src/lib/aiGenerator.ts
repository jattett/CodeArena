import { chatJSON } from './openai'
import type {
  Difficulty,
  FunctionSignature,
  FunctionTestCase,
  GenerateRequest,
  OpenAISettings,
  Param,
  ParamType,
  Problem,
  Solution,
  SolutionKind,
  StarterCodes,
} from '../types'
import { skeletonFromSignature } from './skeleton'
import { signaturePreview } from './signatures'

/* ---------- JSON Schema (힌트용 — strict 모드에서도 모델이 일부 변형할 수 있음) ---------- */

const PARAM_TYPES = [
  'int',
  'long',
  'double',
  'string',
  'bool',
  'int[]',
  'long[]',
  'double[]',
  'string[]',
  'bool[]',
] as const

const PARAM_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'type'],
  properties: {
    name: { type: 'string' },
    type: { type: 'string', enum: PARAM_TYPES },
    description: { type: 'string' },
  },
}

const SIGNATURE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['functionName', 'params', 'returnType'],
  properties: {
    functionName: { type: 'string', description: '기본값은 "solution"' },
    params: { type: 'array', items: PARAM_SCHEMA },
    returnType: { type: 'string', enum: PARAM_TYPES },
  },
}

const TEST_ITEM_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'args', 'expected'],
  properties: {
    name: { type: 'string' },
    args: {
      type: 'array',
      description: 'signature.params 와 길이/순서가 같아야 함. JSON 값.',
    },
    expected: { description: '함수가 return 해야 하는 값. JSON 값.' },
  },
}

const STARTER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['javascript', 'python', 'java', 'csharp'],
  properties: {
    javascript: { type: 'string' },
    python: { type: 'string' },
    java: { type: 'string' },
    csharp: { type: 'string' },
  },
}

const SOLUTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'title', 'code'],
  properties: {
    kind: { type: 'string', enum: ['standard', 'concise', 'optimized'] },
    title: { type: 'string' },
    description: { type: 'string' },
    code: STARTER_SCHEMA,
  },
}

const PROBLEM_SCHEMA = {
  name: 'coding_problem',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'difficulty', 'description', 'signature', 'samples', 'hidden', 'solutions'],
    properties: {
      title: { type: 'string' },
      difficulty: { type: 'string', enum: ['trivial', 'easy', 'medium', 'hard'] },
      description: { type: 'string' },
      signature: SIGNATURE_SCHEMA,
      samples: { type: 'array', items: TEST_ITEM_SCHEMA, minItems: 2, maxItems: 3 },
      hidden: { type: 'array', items: TEST_ITEM_SCHEMA },
      solutions: { type: 'array', items: SOLUTION_SCHEMA, minItems: 1, maxItems: 3 },
    },
  },
} as const

/* ---------- Prompt ---------- */

const SYSTEM_PROMPT = `당신은 한국어 코딩테스트 플랫폼의 문제 출제 전문가입니다.
프로그래머스(programmers.co.kr) 와 **완전히 동일한 스타일** 로 문제를 만듭니다.

## 반드시 지킬 원칙

1. 모든 문제는 stdin/stdout 이 아니라 **"solution 함수 하나를 구현하는"** 형태입니다.
2. signature 에 매개변수 이름/타입, 반환 타입을 선언합니다.
3. 예제(samples) 와 히든(hidden) 은 각각 args 배열과 expected 값으로 표현하세요.
   - args 는 signature.params 와 **같은 순서/길이** 의 JSON 값입니다.
   - expected 는 함수가 return 해야 하는 **실제 JSON 값** 입니다. (문자열 아님!)

## 지원되는 타입 (ParamType)

- 기본: \`int\`, \`long\`, \`double\`, \`string\`, \`bool\`
- 배열: \`int[]\`, \`long[]\`, \`double[]\`, \`string[]\`, \`bool[]\`
- 중첩 배열 / 커스텀 객체 / Map 등은 **사용 금지**.

## 난이도 기준

- trivial : 한두 줄. 루프 없어도 풀 수 있음. (예: 두 수 합, 제곱근)
- easy    : 단순 루프/조건.
- medium  : 표준 자료구조 / 간단한 알고리즘.
- hard    : 그래프/DP/고급.

## starter (스켈레톤) 규칙

네 언어 모두 **본문이 비어 있는 함수 하나** 만 포함합니다. 정답 절대 금지.
형식:

### JavaScript
\`\`\`
function solution(...) {
  // TODO
  return 0;
}
\`\`\`

### Python
\`\`\`
def solution(...) -> ReturnType:
    # TODO
    return 0
\`\`\`

### Java
\`\`\`
class Solution {
    public ReturnType solution(...) {
        // TODO
        return 0;
    }
}
\`\`\`

### C#
\`\`\`
public class Solution {
    public ReturnType solution(...) {
        // TODO
        return 0;
    }
}
\`\`\`

## solutions (정답 풀이) 규칙

- 최소 1개, 최대 3개. 가능하면 \`standard\`, \`concise\`, \`optimized\` 세 가지 제공.
- 각 풀이의 code 는 **"스켈레톤과 같은 구조에서 본문만 채운" 완전한 함수** 여야 합니다.
  (Java/C# 은 \`class Solution { ... }\` 전체 포함)
- 정답은 모든 samples + hidden 을 통과해야 합니다.

## 절대 금지

- stdin/stdout, \`input()\`, \`Scanner\`, \`Console.ReadLine\`, \`process.stdin\` 등 입출력 API 사용.
- print/console.log/System.out.println 등 출력 API (함수는 return 만 사용).
- main 함수 직접 정의 (Java/C# 도 class Solution 만 작성).
- 중첩 배열 / 해시맵 / 커스텀 객체 등 지원 외 타입.
- JSON 외 텍스트.

## 예시 (참고용 — 그대로 복사하지 마세요)

입력: 두 정수 a, b. 출력: a + b.

\`\`\`
{
  "title": "두 수의 합",
  "difficulty": "trivial",
  "description": "두 정수 a, b 가 매개변수로 주어질 때 ...",
  "signature": {
    "functionName": "solution",
    "params": [
      {"name": "a", "type": "int"},
      {"name": "b", "type": "int"}
    ],
    "returnType": "long"
  },
  "samples": [
    {"name": "예제 #1", "args": [1, 2], "expected": 3}
  ],
  "hidden": [
    {"name": "히든 #1", "args": [0, 0], "expected": 0}
  ],
  "solutions": [
    {
      "kind": "standard",
      "title": "더하기",
      "code": {
        "javascript": "function solution(a, b) {\\n  return a + b;\\n}\\n",
        "python": "def solution(a: int, b: int) -> int:\\n    return a + b\\n",
        "java": "class Solution {\\n    public long solution(int a, int b) {\\n        return (long) a + b;\\n    }\\n}\\n",
        "csharp": "public class Solution {\\n    public long solution(int a, int b) => (long) a + b;\\n}\\n"
      }
    }
  ]
}
\`\`\`

JSON 외에 절대 다른 텍스트를 출력하지 마세요.`

function buildUserPrompt(req: GenerateRequest): string {
  const diffLabel = {
    trivial: '아주 쉬움 (Lv.0)',
    easy: '쉬움 (Lv.1)',
    medium: '보통 (Lv.2)',
    hard: '어려움 (Lv.3)',
  }[req.difficulty]

  const trivialExtra =
    req.difficulty === 'trivial'
      ? `

## Lv.0 (trivial) 추가 지침
- 반복문 / 조건문 없이도 풀 수 있을 만큼 매우 단순한 문제.
- 매개변수는 **1~3개** 의 기본 타입 (int, string, bool 등).
- 정답은 한 줄 return 으로 가능한 수준.
- 예: "두 수의 합", "짝수/홀수 판별", "문자열 길이"`
      : ''

  return `다음 명세로 **프로그래머스 스타일** 코딩테스트 문제를 1개 만들어 주세요.

- 주제: ${req.topic || '(자유 — trivial 이면 산술/문자열 관련 기본 문제)'}
- 난이도: ${diffLabel}
- 히든 테스트 개수: ${req.hiddenTestCount}개
- 추가 제약 / 요구사항: ${req.constraints || '(없음)'}
${trivialExtra}

마지막에 스스로 한 번 풀이를 시뮬레이션해서 samples + hidden 모두 통과하는지 검증한 뒤 JSON 을 반환하세요.`
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

function coerceParamType(v: unknown): ParamType {
  const s = String(v ?? '').trim().toLowerCase()
  const norm = s.replace(/\s/g, '')
  const aliases: Record<string, ParamType> = {
    int: 'int',
    integer: 'int',
    i32: 'int',
    i64: 'long',
    long: 'long',
    float: 'double',
    double: 'double',
    number: 'double',
    string: 'string',
    str: 'string',
    bool: 'bool',
    boolean: 'bool',
    'int[]': 'int[]',
    'integer[]': 'int[]',
    'long[]': 'long[]',
    'float[]': 'double[]',
    'double[]': 'double[]',
    'number[]': 'double[]',
    'string[]': 'string[]',
    'str[]': 'string[]',
    'bool[]': 'bool[]',
    'boolean[]': 'bool[]',
  }
  return aliases[norm] ?? 'int'
}

function validateSignature(raw: unknown): FunctionSignature {
  if (!raw || typeof raw !== 'object') throw new Error("'signature' 가 객체가 아닙니다.")
  const s = raw as Record<string, unknown>
  const functionName =
    String(pickFirst(s, ['functionName', 'function_name', 'name']) ?? 'solution') || 'solution'
  const paramsRaw = pickFirst(s, ['params', 'parameters', 'args']) ?? []
  if (!Array.isArray(paramsRaw)) throw new Error("'signature.params' 는 배열이어야 합니다.")
  const params: Param[] = paramsRaw.map((p, i) => {
    const o = (p ?? {}) as Record<string, unknown>
    const name = String(pickFirst(o, ['name', 'key']) ?? `arg${i}`)
    const type = coerceParamType(pickFirst(o, ['type', 'paramType', 'dtype']))
    const description = pickFirst(o, ['description', 'desc'])
    return {
      name,
      type,
      ...(typeof description === 'string' && description ? { description } : {}),
    }
  })
  const returnType = coerceParamType(pickFirst(s, ['returnType', 'return_type', 'returns']))
  return { functionName, params, returnType }
}

function validateTestCases(list: unknown, field: string): FunctionTestCase[] {
  if (!Array.isArray(list)) throw new Error(`'${field}' 는 배열이어야 합니다.`)
  return list.map((raw, i): FunctionTestCase => {
    const t = (raw ?? {}) as Record<string, unknown>
    const args = pickFirst(t, ['args', 'inputs', 'input', 'parameters'])
    const expected = pickFirst(t, ['expected', 'output', 'out', 'answer', 'return'])
    const name =
      String(pickFirst(t, ['name', 'title']) ?? `${field} #${i + 1}`) || `${field} #${i + 1}`
    if (!Array.isArray(args)) {
      throw new Error(`'${field}[${i}].args' 가 배열이 아닙니다.`)
    }
    if (expected === undefined) {
      throw new Error(`'${field}[${i}].expected' 가 없습니다.`)
    }
    return { name, args, expected }
  })
}

function coerceLang(obj: Record<string, unknown>, ...aliases: string[]): string {
  const v = pickFirst(obj, aliases)
  if (typeof v === 'string') return v
  throw new Error(`코드에 '${aliases[0]}' 필드가 없습니다.`)
}

function validateCode(obj: unknown): StarterCodes {
  if (!obj || typeof obj !== 'object') throw new Error("'code' / 'starter' 가 객체가 아닙니다.")
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
  if (s === 'trivial' || s === 'lv0' || s === 'lv.0' || s === '초급') return 'trivial'
  if (s === 'easy' || s === '쉬움' || s === 'low' || s === 'lv1') return 'easy'
  if (s === 'medium' || s === '보통' || s === 'mid' || s === 'normal' || s === 'lv2') return 'medium'
  if (s === 'hard' || s === '어려움' || s === 'high' || s === 'lv3') return 'hard'
  return 'easy'
}

function normalizeSolutions(raw: unknown): Solution[] {
  if (!Array.isArray(raw)) return []
  return raw.map((r, i): Solution => {
    const o = (r ?? {}) as Record<string, unknown>
    const kind = String(pickFirst(o, ['kind', 'type']) ?? 'standard').toLowerCase()
    const safeKind: SolutionKind =
      kind === 'concise' || kind === 'optimized' ? (kind as SolutionKind) : 'standard'
    const title = String(pickFirst(o, ['title', 'name']) ?? `풀이 #${i + 1}`)
    const description = pickFirst(o, ['description', 'desc'])
    const code = validateCode(pickFirst(o, ['code', 'starter', 'solution']))
    return {
      kind: safeKind,
      title,
      ...(typeof description === 'string' && description ? { description } : {}),
      code,
    }
  })
}

function normalizeProblem(raw: unknown): Problem {
  if (!raw || typeof raw !== 'object') throw new Error('AI 응답이 객체가 아닙니다.')
  const p = raw as Record<string, unknown>

  const title = String(pickFirst(p, ['title', 'name']) ?? '').trim() || 'AI 생성 문제'
  const description = String(
    pickFirst(p, ['description', 'problem', 'statement', 'prompt']) ?? '',
  ).trim()

  const signature = validateSignature(pickFirst(p, ['signature', 'function', 'sig']))
  const samples = validateTestCases(
    pickFirst(p, ['samples', 'sampleTests', 'sample_tests', 'examples']) ?? [],
    'samples',
  )
  const hidden = validateTestCases(
    pickFirst(p, ['hidden', 'hiddenTests', 'hidden_tests', 'privateTests']) ?? [],
    'hidden',
  )
  const solutions = normalizeSolutions(pickFirst(p, ['solutions', 'answers', 'references']))

  const starter = skeletonFromSignature(signature)

  return {
    id: slugify(title),
    title,
    difficulty: coerceDifficulty(pickFirst(p, ['difficulty', 'level'])),
    description,
    signature,
    samples,
    hidden,
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
    temperature: 0.7,
    signal,
  })
  return normalizeProblem(payload)
}

/* ---------- 내부 헬퍼 재수출 (테스트 편의용) ---------- */

export { signaturePreview }
