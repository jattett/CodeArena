import type { LanguageDef, Problem } from '../types'

/**
 * 문제 데이터
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
const [a, b] = input.trim().split(/\\s+/).map(Number);
console.log(a + b);
`,
      python: `import sys
a, b = map(int, sys.stdin.read().split())
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
let result = 1n;
for (let i = 2n; i <= BigInt(n); i++) result *= i;
console.log(result.toString());
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
console.log(s.split('').reverse().join(''));
`,
      python: `s = input().strip()
print(s[::-1])
`,
      java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.next();
        System.out.println(new StringBuilder(s).reverse().toString());
    }
}
`,
      csharp: `using System;
using System.Linq;

class Program {
    static void Main() {
        string s = Console.ReadLine().Trim();
        Console.WriteLine(new string(s.Reverse().ToArray()));
    }
}
`,
    },
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
const gcd = (x, y) => y === 0 ? x : gcd(y, x % y);
console.log(gcd(a, b));
`,
      python: `import math
a, b = map(int, input().split())
print(math.gcd(a, b))
`,
      java: `import java.util.Scanner;

public class Main {
    static long gcd(long a, long b) { return b == 0 ? a : gcd(b, a % b); }
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        long a = sc.nextLong(), b = sc.nextLong();
        System.out.println(gcd(a, b));
    }
}
`,
      csharp: `using System;

class Program {
    static long Gcd(long a, long b) => b == 0 ? a : Gcd(b, a % b);
    static void Main() {
        var tokens = Console.ReadLine().Split(' ');
        long a = long.Parse(tokens[0]), b = long.Parse(tokens[1]);
        Console.WriteLine(Gcd(a, b));
    }
}
`,
    },
  },
]

export const LANGUAGES: LanguageDef[] = [
  { id: 'javascript', label: 'JavaScript', ext: 'js' },
  { id: 'python', label: 'Python', ext: 'py' },
  { id: 'java', label: 'Java', ext: 'java' },
  { id: 'csharp', label: 'C#', ext: 'cs' },
]
