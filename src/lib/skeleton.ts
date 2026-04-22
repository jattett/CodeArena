import type { Language, StarterCodes } from '../types'

/**
 * 언어별 기본 스켈레톤 코드.
 * 정답은 없고 stdin 읽기 + TODO 주석만 포함합니다.
 * "답 보기" 버튼을 누르기 전까지 사용자가 보게 되는 초기 코드입니다.
 */
const DEFAULT_SKELETON: StarterCodes = {
  javascript: `// input 변수에 stdin 전체가 문자열로 들어옵니다.
// 예: const tokens = input.trim().split(/\\s+/);

// TODO: 여기에 풀이를 작성하세요.

console.log('');
`,
  python: `import sys

data = sys.stdin.read().split()
# TODO: data 를 파싱해서 풀이를 작성하세요.

print('')
`,
  java: `import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        // TODO: 입력을 읽고 풀이를 작성하세요.

        System.out.println("");
    }
}
`,
  csharp: `using System;

class Program {
    static void Main() {
        string input = Console.In.ReadToEnd();
        // TODO: input 을 파싱해서 풀이를 작성하세요.

        Console.WriteLine("");
    }
}
`,
}

export function defaultSkeleton(lang: Language): string {
  return DEFAULT_SKELETON[lang]
}

export function defaultSkeletonAll(): StarterCodes {
  return { ...DEFAULT_SKELETON }
}
