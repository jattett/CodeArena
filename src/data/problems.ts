import type { LanguageDef, Problem } from '../types'

/**
 * 내장 문제 데이터
 *
 * - `starter` 는 **정답이 없는 스켈레톤 코드**입니다.
 *   사용자가 처음 에디터를 열었을 때 보게 되는 코드이며, 힌트만 포함합니다.
 * - `solutions` 에는 1~3개의 **정답 풀이**가 들어있습니다.
 *   "답 보기" 버튼을 눌러야 공개됩니다.
 *     1) standard : 기본 풀이
 *     2) concise  : 간결한 풀이 (언어 내장 기능 적극 활용)
 *     3) optimized: 최적화 / 변형 풀이 (성능, 큰 수, 다른 접근 등)
 *
 * 모든 문제는 stdin -> stdout 방식으로 채점됩니다.
 */
export const PROBLEMS: Problem[] = [
  {
    id: 'sum-two',
    title: '두 수의 합',
    difficulty: 'easy',
    description: `공백으로 구분된 두 정수 A, B가 주어집니다.
두 수의 합을 출력하세요.

입력
- 한 줄에 두 정수 A, B (-10^9 ≤ A, B ≤ 10^9)

출력
- A + B 값을 한 줄에 출력`,
    sampleTests: [
      { name: '예제 #1', stdin: '1 2\n', expected: '3' },
      { name: '예제 #2', stdin: '-5 10\n', expected: '5' },
    ],
    hiddenTests: [
      { name: '히든 #1', stdin: '0 0\n', expected: '0' },
      { name: '히든 #2', stdin: '1000000000 1000000000\n', expected: '2000000000' },
      { name: '히든 #3', stdin: '-1000000000 -1000000000\n', expected: '-2000000000' },
    ],
    starter: {
      javascript: `// input 변수에 stdin 전체가 문자열로 들어옵니다.
// TODO: input 을 파싱해서 A + B 를 출력하세요.

console.log('');
`,
      python: `import sys

# TODO: 두 정수를 읽어 합을 출력하세요.
data = sys.stdin.read().split()

print('')
`,
      java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // TODO: 두 정수를 읽어 합을 출력하세요.

        System.out.println("");
    }
}
`,
      csharp: `using System;

class Program {
    static void Main() {
        // TODO: 두 정수를 읽어 합을 출력하세요.

        Console.WriteLine("");
    }
}
`,
    },
    solutions: [
      {
        kind: 'standard',
        title: '기본 풀이',
        description: '문자열을 공백 단위로 나눠 숫자로 변환한 뒤 더합니다.',
        code: {
          javascript: `const [a, b] = input.trim().split(/\\s+/).map(Number);
console.log(a + b);
`,
          python: `a, b = map(int, input().split())
print(a + b)
`,
          java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        long a = sc.nextLong();
        long b = sc.nextLong();
        System.out.println(a + b);
    }
}
`,
          csharp: `using System;

class Program {
    static void Main() {
        var tokens = Console.ReadLine().Split(' ');
        long a = long.Parse(tokens[0]);
        long b = long.Parse(tokens[1]);
        Console.WriteLine(a + b);
    }
}
`,
        },
      },
      {
        kind: 'concise',
        title: '간결한 풀이',
        description: '한두 줄로 끝내는 함수형 스타일.',
        code: {
          javascript: `console.log(input.trim().split(/\\s+/).map(Number).reduce((x, y) => x + y));
`,
          python: `print(sum(map(int, __import__('sys').stdin.read().split())))
`,
          java: `import java.util.*;
import java.util.stream.*;

public class Main {
    public static void main(String[] args) {
        long sum = new Scanner(System.in).tokens()
            .mapToLong(Long::parseLong).sum();
        System.out.println(sum);
    }
}
`,
          csharp: `using System;
using System.Linq;

class Program {
    static void Main() {
        long sum = Console.In.ReadToEnd()
            .Split(new[]{' ','\\n','\\r','\\t'}, StringSplitOptions.RemoveEmptyEntries)
            .Sum(long.Parse);
        Console.WriteLine(sum);
    }
}
`,
        },
      },
      {
        kind: 'optimized',
        title: '빠른 입력 풀이',
        description: '큰 입력을 고려해 버퍼드 입출력을 사용합니다.',
        code: {
          javascript: `// 대용량 입력 대비: 한 번에 읽어 토큰화.
const tokens = input.split(/\\s+/).filter(Boolean);
const a = BigInt(tokens[0]);
const b = BigInt(tokens[1]);
console.log((a + b).toString());
`,
          python: `import sys
data = sys.stdin.buffer.read().split()
print(int(data[0]) + int(data[1]))
`,
          java: `import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String[] t = br.readLine().trim().split("\\\\s+");
        long a = Long.parseLong(t[0]);
        long b = Long.parseLong(t[1]);
        System.out.println(a + b);
    }
}
`,
          csharp: `using System;
using System.IO;

class Program {
    static void Main() {
        using var sr = new StreamReader(Console.OpenStandardInput());
        var t = sr.ReadToEnd().Split(new[]{' ','\\n','\\r','\\t'}, StringSplitOptions.RemoveEmptyEntries);
        long a = long.Parse(t[0]);
        long b = long.Parse(t[1]);
        Console.WriteLine(a + b);
    }
}
`,
        },
      },
    ],
  },

  {
    id: 'factorial',
    title: '팩토리얼',
    difficulty: 'easy',
    description: `정수 N이 주어졌을 때, N! (N 팩토리얼)을 출력하세요.

입력
- 한 줄에 정수 N (0 ≤ N ≤ 20)

출력
- N! 값을 출력`,
    sampleTests: [
      { name: '예제 #1', stdin: '5\n', expected: '120' },
      { name: '예제 #2', stdin: '0\n', expected: '1' },
    ],
    hiddenTests: [
      { name: '히든 #1', stdin: '1\n', expected: '1' },
      { name: '히든 #2', stdin: '10\n', expected: '3628800' },
      { name: '히든 #3', stdin: '20\n', expected: '2432902008176640000' },
    ],
    starter: {
      javascript: `const n = parseInt(input.trim(), 10);
// TODO: N! 을 계산해서 출력하세요. (N 이 클 수 있음: BigInt 고려)

console.log('');
`,
      python: `n = int(input())
# TODO: N! 을 계산해서 출력하세요.

print('')
`,
      java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        // TODO: N! 을 계산해서 출력하세요. (큰 수 주의)

        System.out.println("");
    }
}
`,
      csharp: `using System;

class Program {
    static void Main() {
        int n = int.Parse(Console.ReadLine().Trim());
        // TODO: N! 을 계산해서 출력하세요. (큰 수 주의)

        Console.WriteLine("");
    }
}
`,
    },
    solutions: [
      {
        kind: 'standard',
        title: '반복문 풀이',
        description: '1부터 N까지 곱해 나갑니다. 오버플로 방지를 위해 큰 정수 타입 사용.',
        code: {
          javascript: `const n = parseInt(input.trim(), 10);
let r = 1n;
for (let i = 2n; i <= BigInt(n); i++) r *= i;
console.log(r.toString());
`,
          python: `n = int(input())
r = 1
for i in range(2, n + 1):
    r *= i
print(r)
`,
          java: `import java.util.Scanner;
import java.math.BigInteger;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        BigInteger r = BigInteger.ONE;
        for (int i = 2; i <= n; i++) r = r.multiply(BigInteger.valueOf(i));
        System.out.println(r);
    }
}
`,
          csharp: `using System;
using System.Numerics;

class Program {
    static void Main() {
        int n = int.Parse(Console.ReadLine().Trim());
        BigInteger r = 1;
        for (int i = 2; i <= n; i++) r *= i;
        Console.WriteLine(r);
    }
}
`,
        },
      },
      {
        kind: 'concise',
        title: '재귀 / 내장 함수',
        description: '재귀 또는 언어 내장 기능으로 짧게 해결합니다.',
        code: {
          javascript: `const n = parseInt(input.trim(), 10);
const fact = (k) => (k <= 1n ? 1n : k * fact(k - 1n));
console.log(fact(BigInt(n)).toString());
`,
          python: `import math
print(math.factorial(int(input())))
`,
          java: `import java.util.Scanner;
import java.math.BigInteger;

public class Main {
    static BigInteger fact(int k) {
        return k <= 1 ? BigInteger.ONE : BigInteger.valueOf(k).multiply(fact(k - 1));
    }
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.println(fact(sc.nextInt()));
    }
}
`,
          csharp: `using System;
using System.Numerics;

class Program {
    static BigInteger Fact(int k) => k <= 1 ? 1 : k * Fact(k - 1);
    static void Main() {
        Console.WriteLine(Fact(int.Parse(Console.ReadLine().Trim())));
    }
}
`,
        },
      },
      {
        kind: 'optimized',
        title: '메모이제이션',
        description: '같은 값을 여러 번 물어봐도 빠르게 응답하도록 캐시를 활용합니다.',
        code: {
          javascript: `const memo = [1n];
for (let i = 1n; i <= 20n; i++) memo.push(memo[Number(i) - 1] * i);
const n = parseInt(input.trim(), 10);
console.log(memo[n].toString());
`,
          python: `memo = [1]
for i in range(1, 21):
    memo.append(memo[-1] * i)
print(memo[int(input())])
`,
          java: `import java.util.Scanner;
import java.math.BigInteger;

public class Main {
    public static void main(String[] args) {
        BigInteger[] memo = new BigInteger[21];
        memo[0] = BigInteger.ONE;
        for (int i = 1; i <= 20; i++) memo[i] = memo[i - 1].multiply(BigInteger.valueOf(i));
        Scanner sc = new Scanner(System.in);
        System.out.println(memo[sc.nextInt()]);
    }
}
`,
          csharp: `using System;
using System.Numerics;

class Program {
    static void Main() {
        var memo = new BigInteger[21];
        memo[0] = 1;
        for (int i = 1; i <= 20; i++) memo[i] = memo[i - 1] * i;
        Console.WriteLine(memo[int.Parse(Console.ReadLine().Trim())]);
    }
}
`,
        },
      },
    ],
  },

  {
    id: 'fib',
    title: '피보나치 수',
    difficulty: 'medium',
    description: `N번째 피보나치 수를 구하세요.
(F(0) = 0, F(1) = 1, F(n) = F(n-1) + F(n-2))

입력
- 한 줄에 정수 N (0 ≤ N ≤ 90)

출력
- F(N) 값을 출력`,
    sampleTests: [
      { name: '예제 #1', stdin: '10\n', expected: '55' },
      { name: '예제 #2', stdin: '0\n', expected: '0' },
    ],
    hiddenTests: [
      { name: '히든 #1', stdin: '1\n', expected: '1' },
      { name: '히든 #2', stdin: '20\n', expected: '6765' },
      { name: '히든 #3', stdin: '50\n', expected: '12586269025' },
      { name: '히든 #4', stdin: '90\n', expected: '2880067194370816120' },
    ],
    starter: {
      javascript: `const n = parseInt(input.trim(), 10);
// TODO: F(N) 을 계산해서 출력하세요. (N=90 까지 가능: BigInt 사용)

console.log('');
`,
      python: `n = int(input())
# TODO: F(N) 을 계산해서 출력하세요.

print('')
`,
      java: `import java.util.Scanner;
import java.math.BigInteger;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        // TODO: F(N) 을 계산해서 출력하세요.

        System.out.println("");
    }
}
`,
      csharp: `using System;
using System.Numerics;

class Program {
    static void Main() {
        int n = int.Parse(Console.ReadLine().Trim());
        // TODO: F(N) 을 계산해서 출력하세요.

        Console.WriteLine("");
    }
}
`,
    },
    solutions: [
      {
        kind: 'standard',
        title: '반복문 풀이',
        description: '두 개의 변수를 이용해 O(N) 으로 계산합니다.',
        code: {
          javascript: `const n = parseInt(input.trim(), 10);
let a = 0n, b = 1n;
for (let i = 0; i < n; i++) { [a, b] = [b, a + b]; }
console.log(a.toString());
`,
          python: `n = int(input())
a, b = 0, 1
for _ in range(n):
    a, b = b, a + b
print(a)
`,
          java: `import java.util.Scanner;
import java.math.BigInteger;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        BigInteger a = BigInteger.ZERO, b = BigInteger.ONE;
        for (int i = 0; i < n; i++) { BigInteger t = a.add(b); a = b; b = t; }
        System.out.println(a);
    }
}
`,
          csharp: `using System;
using System.Numerics;

class Program {
    static void Main() {
        int n = int.Parse(Console.ReadLine().Trim());
        BigInteger a = 0, b = 1;
        for (int i = 0; i < n; i++) { var t = a + b; a = b; b = t; }
        Console.WriteLine(a);
    }
}
`,
        },
      },
      {
        kind: 'concise',
        title: '재귀 + 메모이제이션',
        description: '재귀로 직관적으로 표현하고 중복 계산을 캐시로 막습니다.',
        code: {
          javascript: `const n = parseInt(input.trim(), 10);
const memo = new Map([[0, 0n], [1, 1n]]);
const fib = (k) => {
  if (memo.has(k)) return memo.get(k);
  const v = fib(k - 1) + fib(k - 2);
  memo.set(k, v);
  return v;
};
console.log(fib(n).toString());
`,
          python: `import sys
from functools import lru_cache
sys.setrecursionlimit(1000)

@lru_cache(None)
def fib(k):
    return k if k < 2 else fib(k - 1) + fib(k - 2)

print(fib(int(input())))
`,
          java: `import java.util.*;
import java.math.BigInteger;

public class Main {
    static Map<Integer, BigInteger> memo = new HashMap<>();
    static BigInteger fib(int k) {
        if (k < 2) return BigInteger.valueOf(k);
        if (memo.containsKey(k)) return memo.get(k);
        BigInteger v = fib(k - 1).add(fib(k - 2));
        memo.put(k, v);
        return v;
    }
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.println(fib(sc.nextInt()));
    }
}
`,
          csharp: `using System;
using System.Collections.Generic;
using System.Numerics;

class Program {
    static Dictionary<int, BigInteger> memo = new();
    static BigInteger Fib(int k) {
        if (k < 2) return k;
        if (memo.TryGetValue(k, out var v)) return v;
        v = Fib(k - 1) + Fib(k - 2);
        memo[k] = v;
        return v;
    }
    static void Main() {
        Console.WriteLine(Fib(int.Parse(Console.ReadLine().Trim())));
    }
}
`,
        },
      },
      {
        kind: 'optimized',
        title: '행렬 거듭제곱 (O(log N))',
        description: '2x2 행렬 거듭제곱으로 매우 큰 N 에도 빠르게 계산합니다.',
        code: {
          javascript: `const n = parseInt(input.trim(), 10);
const mul = (A, B) => [
  [A[0][0]*B[0][0] + A[0][1]*B[1][0], A[0][0]*B[0][1] + A[0][1]*B[1][1]],
  [A[1][0]*B[0][0] + A[1][1]*B[1][0], A[1][0]*B[0][1] + A[1][1]*B[1][1]],
];
let result = [[1n,0n],[0n,1n]];
let base = [[1n,1n],[1n,0n]];
let e = n;
while (e > 0) {
  if (e & 1) result = mul(result, base);
  base = mul(base, base);
  e >>= 1;
}
console.log(result[0][1].toString());
`,
          python: `def mul(A, B):
    return [
        [A[0][0]*B[0][0] + A[0][1]*B[1][0], A[0][0]*B[0][1] + A[0][1]*B[1][1]],
        [A[1][0]*B[0][0] + A[1][1]*B[1][0], A[1][0]*B[0][1] + A[1][1]*B[1][1]],
    ]

n = int(input())
result = [[1,0],[0,1]]
base = [[1,1],[1,0]]
while n > 0:
    if n & 1:
        result = mul(result, base)
    base = mul(base, base)
    n >>= 1
print(result[0][1])
`,
          java: `import java.util.*;
import java.math.BigInteger;

public class Main {
    static BigInteger[][] mul(BigInteger[][] A, BigInteger[][] B) {
        BigInteger[][] R = new BigInteger[2][2];
        R[0][0] = A[0][0].multiply(B[0][0]).add(A[0][1].multiply(B[1][0]));
        R[0][1] = A[0][0].multiply(B[0][1]).add(A[0][1].multiply(B[1][1]));
        R[1][0] = A[1][0].multiply(B[0][0]).add(A[1][1].multiply(B[1][0]));
        R[1][1] = A[1][0].multiply(B[0][1]).add(A[1][1].multiply(B[1][1]));
        return R;
    }
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        long n = sc.nextLong();
        BigInteger[][] result = {{BigInteger.ONE, BigInteger.ZERO}, {BigInteger.ZERO, BigInteger.ONE}};
        BigInteger[][] base = {{BigInteger.ONE, BigInteger.ONE}, {BigInteger.ONE, BigInteger.ZERO}};
        while (n > 0) {
            if ((n & 1) == 1) result = mul(result, base);
            base = mul(base, base);
            n >>= 1;
        }
        System.out.println(result[0][1]);
    }
}
`,
          csharp: `using System;
using System.Numerics;

class Program {
    static BigInteger[,] Mul(BigInteger[,] A, BigInteger[,] B) {
        var R = new BigInteger[2, 2];
        R[0,0] = A[0,0]*B[0,0] + A[0,1]*B[1,0];
        R[0,1] = A[0,0]*B[0,1] + A[0,1]*B[1,1];
        R[1,0] = A[1,0]*B[0,0] + A[1,1]*B[1,0];
        R[1,1] = A[1,0]*B[0,1] + A[1,1]*B[1,1];
        return R;
    }
    static void Main() {
        long n = long.Parse(Console.ReadLine().Trim());
        var result = new BigInteger[,] {{1,0},{0,1}};
        var @base = new BigInteger[,] {{1,1},{1,0}};
        while (n > 0) {
            if ((n & 1) == 1) result = Mul(result, @base);
            @base = Mul(@base, @base);
            n >>= 1;
        }
        Console.WriteLine(result[0,1]);
    }
}
`,
        },
      },
    ],
  },

  {
    id: 'reverse-string',
    title: '문자열 뒤집기',
    difficulty: 'easy',
    description: `문자열 S가 주어지면, 뒤집은 문자열을 출력하세요.

입력
- 한 줄에 문자열 S (공백 없음, 길이 1~100)

출력
- 뒤집은 문자열`,
    sampleTests: [
      { name: '예제 #1', stdin: 'hello\n', expected: 'olleh' },
      { name: '예제 #2', stdin: 'CodeArena\n', expected: 'anerAedoC' },
    ],
    hiddenTests: [
      { name: '히든 #1', stdin: 'a\n', expected: 'a' },
      { name: '히든 #2', stdin: 'racecar\n', expected: 'racecar' },
      { name: '히든 #3', stdin: '1234567890\n', expected: '0987654321' },
    ],
    starter: {
      javascript: `const s = input.trim();
// TODO: 문자열을 뒤집어서 출력하세요.

console.log('');
`,
      python: `s = input().strip()
# TODO: 문자열을 뒤집어서 출력하세요.

print('')
`,
      java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.next();
        // TODO: 문자열을 뒤집어서 출력하세요.

        System.out.println("");
    }
}
`,
      csharp: `using System;

class Program {
    static void Main() {
        string s = Console.ReadLine().Trim();
        // TODO: 문자열을 뒤집어서 출력하세요.

        Console.WriteLine("");
    }
}
`,
    },
    solutions: [
      {
        kind: 'standard',
        title: '반복문 풀이',
        description: '뒤에서부터 한 글자씩 붙여갑니다.',
        code: {
          javascript: `const s = input.trim();
let r = '';
for (let i = s.length - 1; i >= 0; i--) r += s[i];
console.log(r);
`,
          python: `s = input().strip()
r = ''
for ch in reversed(s):
    r += ch
print(r)
`,
          java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.next();
        StringBuilder sb = new StringBuilder();
        for (int i = s.length() - 1; i >= 0; i--) sb.append(s.charAt(i));
        System.out.println(sb);
    }
}
`,
          csharp: `using System;
using System.Text;

class Program {
    static void Main() {
        string s = Console.ReadLine().Trim();
        var sb = new StringBuilder();
        for (int i = s.Length - 1; i >= 0; i--) sb.Append(s[i]);
        Console.WriteLine(sb);
    }
}
`,
        },
      },
      {
        kind: 'concise',
        title: '언어 내장 기능 활용',
        description: '각 언어의 배열/문자열 뒤집기 내장 기능을 사용합니다.',
        code: {
          javascript: `console.log(input.trim().split('').reverse().join(''));
`,
          python: `print(input().strip()[::-1])
`,
          java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.println(new StringBuilder(sc.next()).reverse());
    }
}
`,
          csharp: `using System;
using System.Linq;

class Program {
    static void Main() {
        Console.WriteLine(new string(Console.ReadLine().Trim().Reverse().ToArray()));
    }
}
`,
        },
      },
      {
        kind: 'optimized',
        title: '투 포인터',
        description: '배열 양 끝 포인터를 교환하며 그 자리에서 뒤집습니다.',
        code: {
          javascript: `const arr = input.trim().split('');
let l = 0, r = arr.length - 1;
while (l < r) {
  [arr[l], arr[r]] = [arr[r], arr[l]];
  l++; r--;
}
console.log(arr.join(''));
`,
          python: `s = list(input().strip())
l, r = 0, len(s) - 1
while l < r:
    s[l], s[r] = s[r], s[l]
    l += 1
    r -= 1
print(''.join(s))
`,
          java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        char[] c = sc.next().toCharArray();
        int l = 0, r = c.length - 1;
        while (l < r) {
            char t = c[l]; c[l] = c[r]; c[r] = t;
            l++; r--;
        }
        System.out.println(new String(c));
    }
}
`,
          csharp: `using System;

class Program {
    static void Main() {
        char[] c = Console.ReadLine().Trim().ToCharArray();
        int l = 0, r = c.Length - 1;
        while (l < r) {
            (c[l], c[r]) = (c[r], c[l]);
            l++; r--;
        }
        Console.WriteLine(new string(c));
    }
}
`,
        },
      },
    ],
  },

  {
    id: 'prime-check',
    title: '소수 판별',
    difficulty: 'medium',
    description: `정수 N이 주어졌을 때, 소수인지 판별하세요.

입력
- 한 줄에 정수 N (2 ≤ N ≤ 10^7)

출력
- 소수이면 "YES", 아니면 "NO"`,
    sampleTests: [
      { name: '예제 #1', stdin: '7\n', expected: 'YES' },
      { name: '예제 #2', stdin: '10\n', expected: 'NO' },
    ],
    hiddenTests: [
      { name: '히든 #1', stdin: '2\n', expected: 'YES' },
      { name: '히든 #2', stdin: '9973\n', expected: 'YES' },
      { name: '히든 #3', stdin: '1000000\n', expected: 'NO' },
      { name: '히든 #4', stdin: '9999991\n', expected: 'YES' },
    ],
    starter: {
      javascript: `const n = parseInt(input.trim(), 10);
// TODO: 소수 판별 후 "YES" 또는 "NO" 를 출력하세요.

console.log('');
`,
      python: `n = int(input())
# TODO: 소수 판별 후 "YES" 또는 "NO" 를 출력하세요.

print('')
`,
      java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        long n = sc.nextLong();
        // TODO: 소수 판별 후 "YES" / "NO" 를 출력하세요.

        System.out.println("");
    }
}
`,
      csharp: `using System;

class Program {
    static void Main() {
        long n = long.Parse(Console.ReadLine().Trim());
        // TODO: 소수 판별 후 "YES" / "NO" 를 출력하세요.

        Console.WriteLine("");
    }
}
`,
    },
    solutions: [
      {
        kind: 'standard',
        title: '√N 까지 나눠보기',
        description: '가장 기본이 되는 시도 나눗셈 (trial division) 풀이.',
        code: {
          javascript: `const n = parseInt(input.trim(), 10);
let isPrime = n >= 2;
for (let i = 2; i * i <= n; i++) {
  if (n % i === 0) { isPrime = false; break; }
}
console.log(isPrime ? "YES" : "NO");
`,
          python: `n = int(input())
is_prime = n >= 2
i = 2
while i * i <= n:
    if n % i == 0:
        is_prime = False
        break
    i += 1
print("YES" if is_prime else "NO")
`,
          java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        long n = sc.nextLong();
        boolean isPrime = n >= 2;
        for (long i = 2; i * i <= n; i++) {
            if (n % i == 0) { isPrime = false; break; }
        }
        System.out.println(isPrime ? "YES" : "NO");
    }
}
`,
          csharp: `using System;

class Program {
    static void Main() {
        long n = long.Parse(Console.ReadLine().Trim());
        bool isPrime = n >= 2;
        for (long i = 2; i * i <= n; i++) {
            if (n % i == 0) { isPrime = false; break; }
        }
        Console.WriteLine(isPrime ? "YES" : "NO");
    }
}
`,
        },
      },
      {
        kind: 'concise',
        title: '6k ± 1 최적화',
        description: '2, 3 을 먼저 거르고 6k±1 형태만 검사해 상수를 1/3로 줄입니다.',
        code: {
          javascript: `const n = parseInt(input.trim(), 10);
function isPrime(x) {
  if (x < 2) return false;
  if (x < 4) return true;
  if (x % 2 === 0 || x % 3 === 0) return false;
  for (let i = 5; i * i <= x; i += 6) {
    if (x % i === 0 || x % (i + 2) === 0) return false;
  }
  return true;
}
console.log(isPrime(n) ? "YES" : "NO");
`,
          python: `def is_prime(x):
    if x < 2: return False
    if x < 4: return True
    if x % 2 == 0 or x % 3 == 0: return False
    i = 5
    while i * i <= x:
        if x % i == 0 or x % (i + 2) == 0:
            return False
        i += 6
    return True

print("YES" if is_prime(int(input())) else "NO")
`,
          java: `import java.util.Scanner;

public class Main {
    static boolean isPrime(long x) {
        if (x < 2) return false;
        if (x < 4) return true;
        if (x % 2 == 0 || x % 3 == 0) return false;
        for (long i = 5; i * i <= x; i += 6) {
            if (x % i == 0 || x % (i + 2) == 0) return false;
        }
        return true;
    }
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.println(isPrime(sc.nextLong()) ? "YES" : "NO");
    }
}
`,
          csharp: `using System;

class Program {
    static bool IsPrime(long x) {
        if (x < 2) return false;
        if (x < 4) return true;
        if (x % 2 == 0 || x % 3 == 0) return false;
        for (long i = 5; i * i <= x; i += 6) {
            if (x % i == 0 || x % (i + 2) == 0) return false;
        }
        return true;
    }
    static void Main() {
        long n = long.Parse(Console.ReadLine().Trim());
        Console.WriteLine(IsPrime(n) ? "YES" : "NO");
    }
}
`,
        },
      },
      {
        kind: 'optimized',
        title: '밀러-라빈 (결정론적)',
        description: '작은 소수 집합만으로도 long 범위까지 결정론적으로 판정합니다.',
        code: {
          javascript: `const n = BigInt(input.trim());
function mulMod(a, b, m) { return (a * b) % m; }
function powMod(a, e, m) {
  let r = 1n;
  a %= m;
  while (e > 0n) {
    if (e & 1n) r = mulMod(r, a, m);
    a = mulMod(a, a, m);
    e >>= 1n;
  }
  return r;
}
function millerRabin(n) {
  if (n < 2n) return false;
  for (const p of [2n,3n,5n,7n,11n,13n,17n,19n,23n,29n,31n,37n]) {
    if (n === p) return true;
    if (n % p === 0n) return false;
  }
  let d = n - 1n, r = 0n;
  while ((d & 1n) === 0n) { d >>= 1n; r++; }
  outer: for (const a of [2n,3n,5n,7n,11n,13n,17n,19n,23n,29n,31n,37n]) {
    let x = powMod(a, d, n);
    if (x === 1n || x === n - 1n) continue;
    for (let i = 0n; i < r - 1n; i++) {
      x = mulMod(x, x, n);
      if (x === n - 1n) continue outer;
    }
    return false;
  }
  return true;
}
console.log(millerRabin(n) ? "YES" : "NO");
`,
          python: `def miller_rabin(n):
    if n < 2:
        return False
    for p in (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37):
        if n == p:
            return True
        if n % p == 0:
            return False
    d, r = n - 1, 0
    while d % 2 == 0:
        d //= 2
        r += 1
    for a in (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37):
        x = pow(a, d, n)
        if x in (1, n - 1):
            continue
        for _ in range(r - 1):
            x = x * x % n
            if x == n - 1:
                break
        else:
            return False
    return True

print("YES" if miller_rabin(int(input())) else "NO")
`,
          java: `import java.util.Scanner;
import java.math.BigInteger;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        BigInteger n = sc.nextBigInteger();
        boolean prime = n.isProbablePrime(40) && n.compareTo(BigInteger.ONE) > 0;
        System.out.println(prime ? "YES" : "NO");
    }
}
`,
          csharp: `using System;
using System.Numerics;

class Program {
    static BigInteger Pow(BigInteger a, BigInteger e, BigInteger m) {
        BigInteger r = 1; a %= m;
        while (e > 0) {
            if ((e & 1) == 1) r = r * a % m;
            a = a * a % m;
            e >>= 1;
        }
        return r;
    }
    static bool IsPrime(BigInteger n) {
        if (n < 2) return false;
        int[] ps = {2,3,5,7,11,13,17,19,23,29,31,37};
        foreach (var p in ps) {
            if (n == p) return true;
            if (n % p == 0) return false;
        }
        BigInteger d = n - 1;
        int r = 0;
        while ((d & 1) == 0) { d >>= 1; r++; }
        foreach (var a in ps) {
            var x = Pow(a, d, n);
            if (x == 1 || x == n - 1) continue;
            bool composite = true;
            for (int i = 0; i < r - 1; i++) {
                x = x * x % n;
                if (x == n - 1) { composite = false; break; }
            }
            if (composite) return false;
        }
        return true;
    }
    static void Main() {
        BigInteger n = BigInteger.Parse(Console.ReadLine().Trim());
        Console.WriteLine(IsPrime(n) ? "YES" : "NO");
    }
}
`,
        },
      },
    ],
  },

  {
    id: 'gcd',
    title: '최대 공약수',
    difficulty: 'medium',
    description: `두 자연수 A, B가 주어졌을 때, 최대 공약수를 출력하세요.

입력
- 한 줄에 두 자연수 A, B (1 ≤ A, B ≤ 10^9)

출력
- gcd(A, B)`,
    sampleTests: [
      { name: '예제 #1', stdin: '24 36\n', expected: '12' },
      { name: '예제 #2', stdin: '7 13\n', expected: '1' },
    ],
    hiddenTests: [
      { name: '히든 #1', stdin: '1 1\n', expected: '1' },
      { name: '히든 #2', stdin: '1000000000 500000000\n', expected: '500000000' },
      { name: '히든 #3', stdin: '123456 789012\n', expected: '12' },
    ],
    starter: {
      javascript: `const [a, b] = input.trim().split(/\\s+/).map(Number);
// TODO: gcd(a, b) 를 구해서 출력하세요.

console.log('');
`,
      python: `a, b = map(int, input().split())
# TODO: gcd(a, b) 를 구해서 출력하세요.

print('')
`,
      java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        long a = sc.nextLong(), b = sc.nextLong();
        // TODO: gcd(a, b) 를 구해서 출력하세요.

        System.out.println("");
    }
}
`,
      csharp: `using System;

class Program {
    static void Main() {
        var tokens = Console.ReadLine().Split(' ');
        long a = long.Parse(tokens[0]), b = long.Parse(tokens[1]);
        // TODO: gcd(a, b) 를 구해서 출력하세요.

        Console.WriteLine("");
    }
}
`,
    },
    solutions: [
      {
        kind: 'standard',
        title: '유클리드 호제법 (재귀)',
        description: 'gcd(a, b) = gcd(b, a mod b) 를 재귀로 구현합니다.',
        code: {
          javascript: `const [a, b] = input.trim().split(/\\s+/).map(Number);
const gcd = (x, y) => y === 0 ? x : gcd(y, x % y);
console.log(gcd(a, b));
`,
          python: `def gcd(a, b):
    return a if b == 0 else gcd(b, a % b)

a, b = map(int, input().split())
print(gcd(a, b))
`,
          java: `import java.util.Scanner;

public class Main {
    static long gcd(long a, long b) { return b == 0 ? a : gcd(b, a % b); }
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.println(gcd(sc.nextLong(), sc.nextLong()));
    }
}
`,
          csharp: `using System;

class Program {
    static long Gcd(long a, long b) => b == 0 ? a : Gcd(b, a % b);
    static void Main() {
        var tokens = Console.ReadLine().Split(' ');
        Console.WriteLine(Gcd(long.Parse(tokens[0]), long.Parse(tokens[1])));
    }
}
`,
        },
      },
      {
        kind: 'concise',
        title: '반복문 / 내장 함수',
        description: '재귀 없이 반복문으로, 또는 표준 라이브러리의 gcd 를 사용합니다.',
        code: {
          javascript: `let [a, b] = input.trim().split(/\\s+/).map(Number);
while (b) { [a, b] = [b, a % b]; }
console.log(a);
`,
          python: `import math
a, b = map(int, input().split())
print(math.gcd(a, b))
`,
          java: `import java.util.Scanner;
import java.math.BigInteger;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        BigInteger a = BigInteger.valueOf(sc.nextLong());
        BigInteger b = BigInteger.valueOf(sc.nextLong());
        System.out.println(a.gcd(b));
    }
}
`,
          csharp: `using System;
using System.Numerics;

class Program {
    static void Main() {
        var tokens = Console.ReadLine().Split(' ');
        var a = BigInteger.Parse(tokens[0]);
        var b = BigInteger.Parse(tokens[1]);
        Console.WriteLine(BigInteger.GreatestCommonDivisor(a, b));
    }
}
`,
        },
      },
      {
        kind: 'optimized',
        title: '이진 GCD (Stein)',
        description: '나머지 연산 대신 비트 연산으로 구현해 대형 정수에서 유리합니다.',
        code: {
          javascript: `let [a, b] = input.trim().split(/\\s+/).map(BigInt);
function bgcd(u, v) {
  if (u === 0n) return v;
  if (v === 0n) return u;
  let shift = 0n;
  while (((u | v) & 1n) === 0n) { u >>= 1n; v >>= 1n; shift++; }
  while ((u & 1n) === 0n) u >>= 1n;
  do {
    while ((v & 1n) === 0n) v >>= 1n;
    if (u > v) { const t = u; u = v; v = t; }
    v -= u;
  } while (v !== 0n);
  return u << shift;
}
console.log(bgcd(a, b).toString());
`,
          python: `def bgcd(u, v):
    if u == 0: return v
    if v == 0: return u
    shift = 0
    while ((u | v) & 1) == 0:
        u >>= 1
        v >>= 1
        shift += 1
    while (u & 1) == 0:
        u >>= 1
    while v:
        while (v & 1) == 0:
            v >>= 1
        if u > v:
            u, v = v, u
        v -= u
    return u << shift

a, b = map(int, input().split())
print(bgcd(a, b))
`,
          java: `import java.util.Scanner;

public class Main {
    static long bgcd(long u, long v) {
        if (u == 0) return v;
        if (v == 0) return u;
        int shift = 0;
        while (((u | v) & 1) == 0) { u >>= 1; v >>= 1; shift++; }
        while ((u & 1) == 0) u >>= 1;
        do {
            while ((v & 1) == 0) v >>= 1;
            if (u > v) { long t = u; u = v; v = t; }
            v -= u;
        } while (v != 0);
        return u << shift;
    }
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.println(bgcd(sc.nextLong(), sc.nextLong()));
    }
}
`,
          csharp: `using System;

class Program {
    static long Bgcd(long u, long v) {
        if (u == 0) return v;
        if (v == 0) return u;
        int shift = 0;
        while (((u | v) & 1) == 0) { u >>= 1; v >>= 1; shift++; }
        while ((u & 1) == 0) u >>= 1;
        do {
            while ((v & 1) == 0) v >>= 1;
            if (u > v) { (u, v) = (v, u); }
            v -= u;
        } while (v != 0);
        return u << shift;
    }
    static void Main() {
        var tokens = Console.ReadLine().Split(' ');
        Console.WriteLine(Bgcd(long.Parse(tokens[0]), long.Parse(tokens[1])));
    }
}
`,
        },
      },
    ],
  },
]

export const LANGUAGES: LanguageDef[] = [
  { id: 'javascript', label: 'JavaScript', ext: 'js' },
  { id: 'python', label: 'Python', ext: 'py' },
  { id: 'java', label: 'Java', ext: 'java' },
  { id: 'csharp', label: 'C#', ext: 'cs' },
]
