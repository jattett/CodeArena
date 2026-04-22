import type { FunctionSignature, LanguageDef, Problem } from '../types'
import { skeletonFromSignature } from '../lib/skeleton'

/**
 * 내장 문제 데이터 (프로그래머스 스타일)
 *
 * 모든 문제는 "solution(…)" 함수 하나를 구현하는 방식입니다.
 * - signature : 함수 이름 / 매개변수 / 반환 타입
 * - samples   : 공개 예제 — 입출력이 함수 호출 형태로 표시됩니다
 * - hidden    : 제출 시 평가되는 히든 테스트
 * - starter   : 각 언어의 함수 스켈레톤 (본문이 빈 채로 로드)
 * - solutions : 3가지 스타일의 풀이 (standard / concise / optimized)
 */

function makeStarter(sig: FunctionSignature) {
  return skeletonFromSignature(sig)
}

/* -------------------- 1. 두 수의 합 -------------------- */
const SIG_SUM: FunctionSignature = {
  functionName: 'solution',
  params: [
    { name: 'a', type: 'int', description: '첫 번째 정수' },
    { name: 'b', type: 'int', description: '두 번째 정수' },
  ],
  returnType: 'long',
}

/* -------------------- 2. 팩토리얼 -------------------- */
const SIG_FACT: FunctionSignature = {
  functionName: 'solution',
  params: [{ name: 'n', type: 'int', description: '0 이상의 정수' }],
  returnType: 'long',
}

/* -------------------- 3. 피보나치 -------------------- */
const SIG_FIB: FunctionSignature = {
  functionName: 'solution',
  params: [{ name: 'n', type: 'int', description: '0 이상의 정수' }],
  returnType: 'long',
}

/* -------------------- 4. 문자열 뒤집기 -------------------- */
const SIG_REV: FunctionSignature = {
  functionName: 'solution',
  params: [{ name: 's', type: 'string', description: '뒤집을 문자열' }],
  returnType: 'string',
}

/* -------------------- 5. 소수 판별 -------------------- */
const SIG_PRIME: FunctionSignature = {
  functionName: 'solution',
  params: [{ name: 'n', type: 'int', description: '2 이상의 정수' }],
  returnType: 'bool',
}

/* -------------------- 6. 최대공약수 -------------------- */
const SIG_GCD: FunctionSignature = {
  functionName: 'solution',
  params: [
    { name: 'a', type: 'int', description: '1 이상의 자연수' },
    { name: 'b', type: 'int', description: '1 이상의 자연수' },
  ],
  returnType: 'int',
}

export const PROBLEMS: Problem[] = [
  {
    id: 'sum-two',
    title: '두 수의 합',
    difficulty: 'trivial',
    description: `두 정수 \`a\`, \`b\` 가 매개변수로 주어질 때, 두 수의 합을 return 하도록 solution 함수를 완성해주세요.

제한사항
- -10^9 ≤ a, b ≤ 10^9`,
    signature: SIG_SUM,
    samples: [
      { name: '예제 #1', args: [1, 2], expected: 3 },
      { name: '예제 #2', args: [-5, 10], expected: 5 },
    ],
    hidden: [
      { name: '히든 #1', args: [0, 0], expected: 0 },
      { name: '히든 #2', args: [1000000000, 1000000000], expected: 2000000000 },
      { name: '히든 #3', args: [-1000000000, -1000000000], expected: -2000000000 },
    ],
    starter: makeStarter(SIG_SUM),
    solutions: [
      {
        kind: 'standard',
        title: '더하기 연산자',
        description: 'a 와 b 를 더한 값을 그대로 return 합니다.',
        code: {
          javascript: `function solution(a, b) {
  return a + b;
}
`,
          python: `def solution(a: int, b: int) -> int:
    return a + b
`,
          java: `class Solution {
    public long solution(int a, int b) {
        return (long) a + b;
    }
}
`,
          csharp: `public class Solution {
    public long solution(int a, int b) {
        return (long) a + b;
    }
}
`,
        },
      },
      {
        kind: 'concise',
        title: '한 줄 스타일',
        description: '화살표 함수 / 람다로 한 줄로 표현합니다.',
        code: {
          javascript: `const solution = (a, b) => a + b;
`,
          python: `solution = lambda a, b: a + b
`,
          java: `class Solution {
    public long solution(int a, int b) { return (long) a + b; }
}
`,
          csharp: `public class Solution {
    public long solution(int a, int b) => (long) a + b;
}
`,
        },
      },
    ],
    source: 'builtin',
  },

  {
    id: 'factorial',
    title: '팩토리얼',
    difficulty: 'easy',
    description: `정수 \`n\` 이 매개변수로 주어질 때, \`n!\` (팩토리얼) 을 return 하도록 solution 함수를 완성해주세요.

제한사항
- 0 ≤ n ≤ 20 (long 범위 안에서만 결과가 요구됩니다)`,
    signature: SIG_FACT,
    samples: [
      { name: '예제 #1', args: [5], expected: 120 },
      { name: '예제 #2', args: [0], expected: 1 },
    ],
    hidden: [
      { name: '히든 #1', args: [1], expected: 1 },
      { name: '히든 #2', args: [10], expected: 3628800 },
      { name: '히든 #3', args: [20], expected: 2432902008176640000 },
    ],
    starter: makeStarter(SIG_FACT),
    solutions: [
      {
        kind: 'standard',
        title: '반복문 풀이',
        description: '1부터 n 까지 곱해 나갑니다.',
        code: {
          javascript: `function solution(n) {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}
`,
          python: `def solution(n: int) -> int:
    r = 1
    for i in range(2, n + 1):
        r *= i
    return r
`,
          java: `class Solution {
    public long solution(int n) {
        long r = 1;
        for (int i = 2; i <= n; i++) r *= i;
        return r;
    }
}
`,
          csharp: `public class Solution {
    public long solution(int n) {
        long r = 1;
        for (int i = 2; i <= n; i++) r *= i;
        return r;
    }
}
`,
        },
      },
      {
        kind: 'concise',
        title: '재귀 / 내장 함수',
        description: '재귀 정의를 그대로 옮기거나 표준 라이브러리의 factorial 을 사용합니다.',
        code: {
          javascript: `function solution(n) {
  return n <= 1 ? 1 : n * solution(n - 1);
}
`,
          python: `from math import factorial

def solution(n: int) -> int:
    return factorial(n)
`,
          java: `class Solution {
    public long solution(int n) {
        return n <= 1 ? 1L : (long) n * solution(n - 1);
    }
}
`,
          csharp: `public class Solution {
    public long solution(int n) => n <= 1 ? 1L : (long) n * solution(n - 1);
}
`,
        },
      },
      {
        kind: 'optimized',
        title: '메모이제이션',
        description: '0~20 을 미리 계산해 두면 여러 번 호출해도 O(1) 로 응답할 수 있습니다.',
        code: {
          javascript: `const MEMO = (() => {
  const m = [1];
  for (let i = 1; i <= 20; i++) m.push(m[i - 1] * i);
  return m;
})();
function solution(n) {
  return MEMO[n];
}
`,
          python: `_MEMO = [1]
for _i in range(1, 21):
    _MEMO.append(_MEMO[-1] * _i)

def solution(n: int) -> int:
    return _MEMO[n]
`,
          java: `class Solution {
    static final long[] MEMO = new long[21];
    static {
        MEMO[0] = 1;
        for (int i = 1; i <= 20; i++) MEMO[i] = MEMO[i - 1] * i;
    }
    public long solution(int n) { return MEMO[n]; }
}
`,
          csharp: `public class Solution {
    static readonly long[] MEMO = BuildMemo();
    static long[] BuildMemo() {
        var m = new long[21];
        m[0] = 1;
        for (int i = 1; i <= 20; i++) m[i] = m[i - 1] * i;
        return m;
    }
    public long solution(int n) => MEMO[n];
}
`,
        },
      },
    ],
    source: 'builtin',
  },

  {
    id: 'fib',
    title: '피보나치 수',
    difficulty: 'easy',
    description: `0 이상의 정수 \`n\` 이 매개변수로 주어질 때, \`n\` 번째 피보나치 수를 return 하도록 solution 함수를 완성해주세요.

(\`F(0) = 0, F(1) = 1, F(n) = F(n-1) + F(n-2)\`)

제한사항
- 0 ≤ n ≤ 90`,
    signature: SIG_FIB,
    samples: [
      { name: '예제 #1', args: [10], expected: 55 },
      { name: '예제 #2', args: [0], expected: 0 },
    ],
    hidden: [
      { name: '히든 #1', args: [1], expected: 1 },
      { name: '히든 #2', args: [20], expected: 6765 },
      { name: '히든 #3', args: [50], expected: 12586269025 },
      { name: '히든 #4', args: [90], expected: 2880067194370816120 },
    ],
    starter: makeStarter(SIG_FIB),
    solutions: [
      {
        kind: 'standard',
        title: '반복문 (O(N))',
        description: '두 변수를 이용해 순차적으로 더해 갑니다.',
        code: {
          javascript: `function solution(n) {
  let a = 0n, b = 1n;
  for (let i = 0; i < n; i++) { const t = a + b; a = b; b = t; }
  return Number(a);
}
`,
          python: `def solution(n: int) -> int:
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a
`,
          java: `class Solution {
    public long solution(int n) {
        long a = 0, b = 1;
        for (int i = 0; i < n; i++) { long t = a + b; a = b; b = t; }
        return a;
    }
}
`,
          csharp: `public class Solution {
    public long solution(int n) {
        long a = 0, b = 1;
        for (int i = 0; i < n; i++) { long t = a + b; a = b; b = t; }
        return a;
    }
}
`,
        },
      },
      {
        kind: 'concise',
        title: '재귀 + 메모이제이션',
        description: '재귀식 그대로 표현하고 중복 호출은 캐시로 막습니다.',
        code: {
          javascript: `const __memo = [0n, 1n];
function solution(n) {
  for (let i = __memo.length; i <= n; i++) __memo.push(__memo[i - 1] + __memo[i - 2]);
  return Number(__memo[n]);
}
`,
          python: `from functools import lru_cache

@lru_cache(None)
def _fib(k: int) -> int:
    return k if k < 2 else _fib(k - 1) + _fib(k - 2)

def solution(n: int) -> int:
    return _fib(n)
`,
          java: `import java.util.HashMap;
import java.util.Map;
class Solution {
    private final Map<Integer, Long> memo = new HashMap<>();
    public long solution(int n) {
        if (n < 2) return n;
        Long v = memo.get(n);
        if (v != null) return v;
        long r = solution(n - 1) + solution(n - 2);
        memo.put(n, r);
        return r;
    }
}
`,
          csharp: `using System.Collections.Generic;
public class Solution {
    private readonly Dictionary<int, long> memo = new();
    public long solution(int n) {
        if (n < 2) return n;
        if (memo.TryGetValue(n, out long v)) return v;
        v = solution(n - 1) + solution(n - 2);
        memo[n] = v;
        return v;
    }
}
`,
        },
      },
      {
        kind: 'optimized',
        title: '상수 공간',
        description: '두 변수만으로 계산해 O(1) 공간으로 해결합니다.',
        code: {
          javascript: `function solution(n) {
  if (n < 2) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) { const t = a + b; a = b; b = t; }
  return b;
}
`,
          python: `def solution(n: int) -> int:
    if n < 2:
        return n
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b
`,
          java: `class Solution {
    public long solution(int n) {
        if (n < 2) return n;
        long a = 0, b = 1;
        for (int i = 2; i <= n; i++) { long t = a + b; a = b; b = t; }
        return b;
    }
}
`,
          csharp: `public class Solution {
    public long solution(int n) {
        if (n < 2) return n;
        long a = 0, b = 1;
        for (int i = 2; i <= n; i++) { long t = a + b; a = b; b = t; }
        return b;
    }
}
`,
        },
      },
    ],
    source: 'builtin',
  },

  {
    id: 'reverse-string',
    title: '문자열 뒤집기',
    difficulty: 'trivial',
    description: `문자열 \`s\` 가 매개변수로 주어질 때, 문자열을 뒤집은 결과를 return 하도록 solution 함수를 완성해주세요.

제한사항
- 1 ≤ s 의 길이 ≤ 100`,
    signature: SIG_REV,
    samples: [
      { name: '예제 #1', args: ['hello'], expected: 'olleh' },
      { name: '예제 #2', args: ['CodeArena'], expected: 'anerAedoC' },
    ],
    hidden: [
      { name: '히든 #1', args: ['a'], expected: 'a' },
      { name: '히든 #2', args: ['racecar'], expected: 'racecar' },
      { name: '히든 #3', args: ['1234567890'], expected: '0987654321' },
    ],
    starter: makeStarter(SIG_REV),
    solutions: [
      {
        kind: 'standard',
        title: '내장 기능 사용',
        description: '각 언어의 배열/문자열 뒤집기 기능을 사용합니다.',
        code: {
          javascript: `function solution(s) {
  return s.split('').reverse().join('');
}
`,
          python: `def solution(s: str) -> str:
    return s[::-1]
`,
          java: `class Solution {
    public String solution(String s) {
        return new StringBuilder(s).reverse().toString();
    }
}
`,
          csharp: `using System.Linq;
public class Solution {
    public string solution(string s) => new string(s.Reverse().ToArray());
}
`,
        },
      },
      {
        kind: 'concise',
        title: '반복문으로 직접',
        description: '뒤에서부터 한 글자씩 붙여 명시적으로 구현합니다.',
        code: {
          javascript: `function solution(s) {
  let r = '';
  for (let i = s.length - 1; i >= 0; i--) r += s[i];
  return r;
}
`,
          python: `def solution(s: str) -> str:
    r = ''
    for ch in reversed(s):
        r += ch
    return r
`,
          java: `class Solution {
    public String solution(String s) {
        StringBuilder sb = new StringBuilder();
        for (int i = s.length() - 1; i >= 0; i--) sb.append(s.charAt(i));
        return sb.toString();
    }
}
`,
          csharp: `using System.Text;
public class Solution {
    public string solution(string s) {
        var sb = new StringBuilder();
        for (int i = s.Length - 1; i >= 0; i--) sb.Append(s[i]);
        return sb.ToString();
    }
}
`,
        },
      },
    ],
    source: 'builtin',
  },

  {
    id: 'prime-check',
    title: '소수 판별',
    difficulty: 'easy',
    description: `정수 \`n\` 이 매개변수로 주어질 때, 소수이면 \`true\`, 아니면 \`false\` 를 return 하도록 solution 함수를 완성해주세요.

제한사항
- 2 ≤ n ≤ 10^7`,
    signature: SIG_PRIME,
    samples: [
      { name: '예제 #1', args: [7], expected: true },
      { name: '예제 #2', args: [10], expected: false },
    ],
    hidden: [
      { name: '히든 #1', args: [2], expected: true },
      { name: '히든 #2', args: [9973], expected: true },
      { name: '히든 #3', args: [1000000], expected: false },
      { name: '히든 #4', args: [9999991], expected: true },
    ],
    starter: makeStarter(SIG_PRIME),
    solutions: [
      {
        kind: 'standard',
        title: '√N 까지 나눠보기',
        description: '가장 기본 시도 나눗셈 (trial division).',
        code: {
          javascript: `function solution(n) {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
}
`,
          python: `def solution(n: int) -> bool:
    if n < 2:
        return False
    i = 2
    while i * i <= n:
        if n % i == 0:
            return False
        i += 1
    return True
`,
          java: `class Solution {
    public boolean solution(int n) {
        if (n < 2) return false;
        for (long i = 2; i * i <= n; i++) if (n % i == 0) return false;
        return true;
    }
}
`,
          csharp: `public class Solution {
    public bool solution(int n) {
        if (n < 2) return false;
        for (long i = 2; i * i <= n; i++) if (n % i == 0) return false;
        return true;
    }
}
`,
        },
      },
      {
        kind: 'optimized',
        title: '6k ± 1 최적화',
        description: '2, 3 을 먼저 처리하고 6k±1 형태만 검사합니다.',
        code: {
          javascript: `function solution(n) {
  if (n < 2) return false;
  if (n < 4) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
}
`,
          python: `def solution(n: int) -> bool:
    if n < 2:
        return False
    if n < 4:
        return True
    if n % 2 == 0 or n % 3 == 0:
        return False
    i = 5
    while i * i <= n:
        if n % i == 0 or n % (i + 2) == 0:
            return False
        i += 6
    return True
`,
          java: `class Solution {
    public boolean solution(int n) {
        if (n < 2) return false;
        if (n < 4) return true;
        if (n % 2 == 0 || n % 3 == 0) return false;
        for (long i = 5; i * i <= n; i += 6) {
            if (n % i == 0 || n % (i + 2) == 0) return false;
        }
        return true;
    }
}
`,
          csharp: `public class Solution {
    public bool solution(int n) {
        if (n < 2) return false;
        if (n < 4) return true;
        if (n % 2 == 0 || n % 3 == 0) return false;
        for (long i = 5; i * i <= n; i += 6) {
            if (n % i == 0 || n % (i + 2) == 0) return false;
        }
        return true;
    }
}
`,
        },
      },
    ],
    source: 'builtin',
  },

  {
    id: 'gcd',
    title: '최대 공약수',
    difficulty: 'easy',
    description: `두 자연수 \`a\`, \`b\` 가 매개변수로 주어질 때, 두 수의 최대 공약수를 return 하도록 solution 함수를 완성해주세요.

제한사항
- 1 ≤ a, b ≤ 10^9`,
    signature: SIG_GCD,
    samples: [
      { name: '예제 #1', args: [24, 36], expected: 12 },
      { name: '예제 #2', args: [7, 13], expected: 1 },
    ],
    hidden: [
      { name: '히든 #1', args: [1, 1], expected: 1 },
      { name: '히든 #2', args: [1000000000, 500000000], expected: 500000000 },
      { name: '히든 #3', args: [123456, 789012], expected: 12 },
    ],
    starter: makeStarter(SIG_GCD),
    solutions: [
      {
        kind: 'standard',
        title: '유클리드 호제법 (재귀)',
        description: 'gcd(a, b) = gcd(b, a mod b) 를 재귀로 구현합니다.',
        code: {
          javascript: `function solution(a, b) {
  return b === 0 ? a : solution(b, a % b);
}
`,
          python: `def solution(a: int, b: int) -> int:
    return a if b == 0 else solution(b, a % b)
`,
          java: `class Solution {
    public int solution(int a, int b) {
        return b == 0 ? a : solution(b, a % b);
    }
}
`,
          csharp: `public class Solution {
    public int solution(int a, int b) => b == 0 ? a : solution(b, a % b);
}
`,
        },
      },
      {
        kind: 'concise',
        title: '반복문 / 내장 함수',
        description: '재귀 대신 루프를 사용하거나 표준 라이브러리 gcd 를 호출합니다.',
        code: {
          javascript: `function solution(a, b) {
  while (b) { [a, b] = [b, a % b]; }
  return a;
}
`,
          python: `from math import gcd

def solution(a: int, b: int) -> int:
    return gcd(a, b)
`,
          java: `import java.math.BigInteger;
class Solution {
    public int solution(int a, int b) {
        return BigInteger.valueOf(a).gcd(BigInteger.valueOf(b)).intValue();
    }
}
`,
          csharp: `using System.Numerics;
public class Solution {
    public int solution(int a, int b) => (int) BigInteger.GreatestCommonDivisor(a, b);
}
`,
        },
      },
    ],
    source: 'builtin',
  },
]

export const LANGUAGES: LanguageDef[] = [
  { id: 'javascript', label: 'JavaScript', ext: 'js' },
  { id: 'python', label: 'Python', ext: 'py' },
  { id: 'java', label: 'Java', ext: 'java' },
  { id: 'csharp', label: 'C#', ext: 'cs' },
]
