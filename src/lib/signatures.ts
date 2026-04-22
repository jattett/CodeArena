import type { FunctionSignature, Language, Param, ParamType } from '../types'

/* ============================================================ *
 *  타입 매핑 & 표시
 * ============================================================ */

const LANG_TYPE: Record<ParamType, Record<Language, string>> = {
  int: { javascript: 'number', python: 'int', java: 'int', csharp: 'int' },
  long: { javascript: 'number', python: 'int', java: 'long', csharp: 'long' },
  double: { javascript: 'number', python: 'float', java: 'double', csharp: 'double' },
  string: { javascript: 'string', python: 'str', java: 'String', csharp: 'string' },
  bool: { javascript: 'boolean', python: 'bool', java: 'boolean', csharp: 'bool' },
  'int[]': { javascript: 'number[]', python: 'list[int]', java: 'int[]', csharp: 'int[]' },
  'long[]': { javascript: 'number[]', python: 'list[int]', java: 'long[]', csharp: 'long[]' },
  'double[]': {
    javascript: 'number[]',
    python: 'list[float]',
    java: 'double[]',
    csharp: 'double[]',
  },
  'string[]': {
    javascript: 'string[]',
    python: 'list[str]',
    java: 'String[]',
    csharp: 'string[]',
  },
  'bool[]': {
    javascript: 'boolean[]',
    python: 'list[bool]',
    java: 'boolean[]',
    csharp: 'bool[]',
  },
}

export function langType(t: ParamType, lang: Language): string {
  return LANG_TYPE[t][lang]
}

/** 프로그래머스처럼 "int solution(int a, int b)" 같은 프리뷰 문자열. */
export function signaturePreview(sig: FunctionSignature, lang: Language): string {
  const ret = langType(sig.returnType, lang)
  const params = sig.params.map((p) => `${langType(p.type, lang)} ${p.name}`).join(', ')
  switch (lang) {
    case 'javascript':
      return `function ${sig.functionName}(${sig.params.map((p) => p.name).join(', ')})  // returns ${ret}`
    case 'python':
      return `def ${sig.functionName}(${sig.params.map((p) => `${p.name}: ${langType(p.type, lang)}`).join(', ')}) -> ${ret}`
    case 'java':
      return `public ${ret} ${sig.functionName}(${params})`
    case 'csharp':
      return `public ${ret} ${sig.functionName}(${params})`
  }
}

/* ============================================================ *
 *  기본값 / 반환 타입 별 default
 * ============================================================ */

export function defaultReturnLiteral(t: ParamType, lang: Language): string {
  const isArr = t.endsWith('[]')
  if (isArr) {
    switch (lang) {
      case 'javascript':
        return '[]'
      case 'python':
        return '[]'
      case 'java':
        if (t === 'int[]') return 'new int[0]'
        if (t === 'long[]') return 'new long[0]'
        if (t === 'double[]') return 'new double[0]'
        if (t === 'string[]') return 'new String[0]'
        if (t === 'bool[]') return 'new boolean[0]'
        return 'null'
      case 'csharp':
        if (t === 'int[]') return 'new int[0]'
        if (t === 'long[]') return 'new long[0]'
        if (t === 'double[]') return 'new double[0]'
        if (t === 'string[]') return 'new string[0]'
        if (t === 'bool[]') return 'new bool[0]'
        return 'null'
    }
  }
  switch (t) {
    case 'int':
    case 'long':
      return '0'
    case 'double':
      return lang === 'java' || lang === 'csharp' ? '0.0' : '0'
    case 'bool':
      return lang === 'python' ? 'False' : 'false'
    case 'string':
      return lang === 'python' ? "''" : '""'
    default:
      return '0'
  }
}

/* ============================================================ *
 *  함수 스켈레톤 생성 (각 언어별 "빈 함수 하나")
 * ============================================================ */

export function buildSkeleton(sig: FunctionSignature, lang: Language): string {
  switch (lang) {
    case 'javascript':
      return buildJsSkeleton(sig)
    case 'python':
      return buildPySkeleton(sig)
    case 'java':
      return buildJavaSkeleton(sig)
    case 'csharp':
      return buildCsSkeleton(sig)
  }
}

function buildJsSkeleton(sig: FunctionSignature): string {
  const names = sig.params.map((p) => p.name).join(', ')
  const ret = defaultReturnLiteral(sig.returnType, 'javascript')
  const paramDoc = sig.params
    .map((p) => ` *   @param {${langType(p.type, 'javascript')}} ${p.name}${p.description ? ` - ${p.description}` : ''}`)
    .join('\n')
  return `/**
 * ${sig.functionName}
${paramDoc}
 *   @returns {${langType(sig.returnType, 'javascript')}}
 */
function ${sig.functionName}(${names}) {
  // TODO: 풀이를 작성하고 결과를 return 하세요.
  return ${ret};
}
`
}

function buildPySkeleton(sig: FunctionSignature): string {
  const paramsWithTypes = sig.params
    .map((p) => `${p.name}: ${langType(p.type, 'python')}`)
    .join(', ')
  const ret = defaultReturnLiteral(sig.returnType, 'python')
  return `def ${sig.functionName}(${paramsWithTypes}) -> ${langType(sig.returnType, 'python')}:
    # TODO: 풀이를 작성하고 결과를 return 하세요.
    return ${ret}
`
}

function buildJavaSkeleton(sig: FunctionSignature): string {
  const paramsStr = sig.params.map((p) => `${langType(p.type, 'java')} ${p.name}`).join(', ')
  const ret = defaultReturnLiteral(sig.returnType, 'java')
  return `class Solution {
    public ${langType(sig.returnType, 'java')} ${sig.functionName}(${paramsStr}) {
        // TODO: 풀이를 작성하고 결과를 return 하세요.
        return ${ret};
    }
}
`
}

function buildCsSkeleton(sig: FunctionSignature): string {
  const paramsStr = sig.params.map((p) => `${langType(p.type, 'csharp')} ${p.name}`).join(', ')
  const ret = defaultReturnLiteral(sig.returnType, 'csharp')
  return `public class Solution {
    public ${langType(sig.returnType, 'csharp')} ${sig.functionName}(${paramsStr}) {
        // TODO: 풀이를 작성하고 결과를 return 하세요.
        return ${ret};
    }
}
`
}

/* ============================================================ *
 *  입력(stdin) 생성 — 모든 언어 공통 규격
 *    - args 배열의 각 원소를 한 줄씩 JSON.stringify 한 뒤 '\n' 으로 연결
 * ============================================================ */

export function encodeArgsToStdin(args: unknown[]): string {
  return args.map((a) => JSON.stringify(a)).join('\n')
}

/* ============================================================ *
 *  래퍼 생성 — 사용자 코드를 "완전 실행 가능한 프로그램" 으로 감쌉니다.
 *    - JS/Python: 문자열 합성 (용자 코드 뒤에 호출부 append)
 *    - Java/C#:  Main 클래스 안에 Solution 을 new 해서 호출
 *
 *    반환: 언어별 실행 가능한 단일 소스 문자열
 * ============================================================ */

export function wrapForExecution(
  sig: FunctionSignature,
  userCode: string,
  lang: Language,
): string {
  switch (lang) {
    case 'javascript':
      return wrapJs(sig, userCode)
    case 'python':
      return wrapPy(sig, userCode)
    case 'java':
      return wrapJava(sig, userCode)
    case 'csharp':
      return wrapCs(sig, userCode)
  }
}

/* ---------- JavaScript ---------- */

function wrapJs(sig: FunctionSignature, userCode: string): string {
  return `
/* ---------- USER CODE ---------- */
${userCode}
/* ---------- END USER CODE ---------- */

await (async () => {
  const __lines = String(input ?? '').replace(/\\r/g, '').split('\\n').filter((s, i, arr) => !(s === '' && i === arr.length - 1));
  const __args = __lines.map((ln) => JSON.parse(ln));
  if (typeof ${sig.functionName} !== 'function') {
    throw new Error("'${sig.functionName}' 함수가 정의되어 있지 않습니다.");
  }
  const __r = await ${sig.functionName}.apply(null, __args);
  const json = JSON.stringify(__r, (_, v) => typeof v === 'bigint' ? Number(v) : v);
  process.stdout.write('\\x1e__RESULT__:' + json + ':__END__\\x1e');
})();
`
}

/* ---------- Python ---------- */

function wrapPy(sig: FunctionSignature, userCode: string): string {
  return `# ---------- USER CODE ----------
${userCode}
# ---------- END USER CODE ----------

import sys as _sys, json as _json
_lines = [ln for ln in _sys.stdin.read().split('\\n') if ln != '']
_args = [_json.loads(ln) for ln in _lines]
if '${sig.functionName}' not in dir() or not callable(${sig.functionName}):
    raise NameError("'${sig.functionName}' 함수가 정의되어 있지 않습니다.")
_r = ${sig.functionName}(*_args)
_sys.stdout.write('\\x1e__RESULT__:' + _json.dumps(_r, ensure_ascii=False) + ':__END__\\x1e')
`
}

/* ---------- Java ---------- *
 *   사용자 코드는 "class Solution { ...solution(...) }" 전체.
 *   Main 에서 stdin 을 한 줄씩 읽어 타입별로 파싱 → Solution.solution(...) 호출 → JSON 출력.
 */

function wrapJava(sig: FunctionSignature, userCode: string): string {
  const argReads = sig.params
    .map((p, i) => `        ${langType(p.type, 'java')} __a${i} = ${javaParseExpr(p.type, `__input[${i}]`)};`)
    .join('\n')
  const callArgs = sig.params.map((_, i) => `__a${i}`).join(', ')
  const printCall = javaJsonWriter(sig.returnType, '__r')
  // 사용자 코드가 자체 import 를 가질 수 있기 때문에, 래퍼의 공통 import 는
  // 사용자 코드보다 '먼저' 와야 Java 컴파일러가 허용합니다 (import > class 순서).
  return `import java.util.*;
import java.io.*;

/* ---------- USER CODE ---------- */
${userCode}
/* ---------- END USER CODE ---------- */

public class Main {
    public static void main(String[] __args) throws Exception {
        BufferedReader __br = new BufferedReader(new InputStreamReader(System.in));
        List<String> __in = new ArrayList<>();
        String __ln;
        while ((__ln = __br.readLine()) != null) { if (!__ln.isEmpty()) __in.add(__ln); }
        String[] __input = __in.toArray(new String[0]);

${argReads}

        Solution __sol = new Solution();
        ${langType(sig.returnType, 'java')} __r = __sol.${sig.functionName}(${callArgs});

        StringBuilder __out = new StringBuilder();
        __out.append((char)0x1e).append("__RESULT__:");
        ${printCall}
        __out.append(":__END__").append((char)0x1e);
        System.out.print(__out.toString());
    }

    /* ---------- JSON micro-utils ---------- */
    static String __parseString(String s) {
        // s 는 JSON string 표현 ("...") — 이스케이프 처리
        if (s == null || s.length() < 2) return "";
        StringBuilder b = new StringBuilder();
        for (int i = 1; i < s.length() - 1; i++) {
            char c = s.charAt(i);
            if (c == '\\\\' && i + 1 < s.length() - 1) {
                char n = s.charAt(++i);
                switch (n) {
                    case 'n': b.append('\\n'); break;
                    case 't': b.append('\\t'); break;
                    case 'r': b.append('\\r'); break;
                    case '"': b.append('"'); break;
                    case '\\\\': b.append('\\\\'); break;
                    case '/': b.append('/'); break;
                    case 'u': {
                        if (i + 4 < s.length()) {
                            String hex = s.substring(i + 1, i + 5);
                            b.append((char) Integer.parseInt(hex, 16));
                            i += 4;
                        }
                        break;
                    }
                    default: b.append(n);
                }
            } else {
                b.append(c);
            }
        }
        return b.toString();
    }
    static String[] __splitJsonArray(String s) {
        // s = "[a,b,c]" 에서 콤마로 원소 분리 — nested 는 지원하지 않음
        String body = s.trim();
        body = body.substring(1, body.length() - 1).trim();
        if (body.isEmpty()) return new String[0];
        List<String> parts = new ArrayList<>();
        int depth = 0; boolean inStr = false; boolean esc = false;
        StringBuilder cur = new StringBuilder();
        for (int i = 0; i < body.length(); i++) {
            char c = body.charAt(i);
            if (esc) { cur.append(c); esc = false; continue; }
            if (inStr) {
                cur.append(c);
                if (c == '\\\\') esc = true;
                else if (c == '"') inStr = false;
                continue;
            }
            if (c == '"') { inStr = true; cur.append(c); continue; }
            if (c == '[') { depth++; cur.append(c); continue; }
            if (c == ']') { depth--; cur.append(c); continue; }
            if (c == ',' && depth == 0) { parts.add(cur.toString().trim()); cur.setLength(0); continue; }
            cur.append(c);
        }
        if (cur.length() > 0) parts.add(cur.toString().trim());
        return parts.toArray(new String[0]);
    }
    static int[] __parseIntArray(String s) {
        String[] xs = __splitJsonArray(s);
        int[] out = new int[xs.length];
        for (int i = 0; i < xs.length; i++) out[i] = Integer.parseInt(xs[i].trim());
        return out;
    }
    static long[] __parseLongArray(String s) {
        String[] xs = __splitJsonArray(s);
        long[] out = new long[xs.length];
        for (int i = 0; i < xs.length; i++) out[i] = Long.parseLong(xs[i].trim());
        return out;
    }
    static double[] __parseDoubleArray(String s) {
        String[] xs = __splitJsonArray(s);
        double[] out = new double[xs.length];
        for (int i = 0; i < xs.length; i++) out[i] = Double.parseDouble(xs[i].trim());
        return out;
    }
    static boolean[] __parseBoolArray(String s) {
        String[] xs = __splitJsonArray(s);
        boolean[] out = new boolean[xs.length];
        for (int i = 0; i < xs.length; i++) out[i] = Boolean.parseBoolean(xs[i].trim());
        return out;
    }
    static String[] __parseStringArray(String s) {
        String[] xs = __splitJsonArray(s);
        String[] out = new String[xs.length];
        for (int i = 0; i < xs.length; i++) out[i] = __parseString(xs[i].trim());
        return out;
    }

    static String __escapeJson(String s) {
        StringBuilder b = new StringBuilder("\\"");
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '\\\\': b.append("\\\\\\\\"); break;
                case '"': b.append("\\\\\\""); break;
                case '\\n': b.append("\\\\n"); break;
                case '\\r': b.append("\\\\r"); break;
                case '\\t': b.append("\\\\t"); break;
                default:
                    if (c < 0x20) b.append(String.format("\\\\u%04x", (int) c));
                    else b.append(c);
            }
        }
        b.append("\\"");
        return b.toString();
    }
}
`
}

function javaParseExpr(t: ParamType, src: string): string {
  switch (t) {
    case 'int':
      return `Integer.parseInt(${src}.trim())`
    case 'long':
      return `Long.parseLong(${src}.trim())`
    case 'double':
      return `Double.parseDouble(${src}.trim())`
    case 'bool':
      return `Boolean.parseBoolean(${src}.trim())`
    case 'string':
      return `Main.__parseString(${src})`
    case 'int[]':
      return `Main.__parseIntArray(${src})`
    case 'long[]':
      return `Main.__parseLongArray(${src})`
    case 'double[]':
      return `Main.__parseDoubleArray(${src})`
    case 'bool[]':
      return `Main.__parseBoolArray(${src})`
    case 'string[]':
      return `Main.__parseStringArray(${src})`
  }
}

function javaJsonWriter(t: ParamType, v: string): string {
  switch (t) {
    case 'int':
    case 'long':
    case 'double':
      return `__out.append(String.valueOf(${v}));`
    case 'bool':
      return `__out.append(${v} ? "true" : "false");`
    case 'string':
      return `__out.append(Main.__escapeJson(${v} == null ? "" : ${v}));`
    case 'int[]':
      return `__out.append("["); for (int __i = 0; __i < ${v}.length; __i++) { if (__i > 0) __out.append(","); __out.append(String.valueOf(${v}[__i])); } __out.append("]");`
    case 'long[]':
      return `__out.append("["); for (int __i = 0; __i < ${v}.length; __i++) { if (__i > 0) __out.append(","); __out.append(String.valueOf(${v}[__i])); } __out.append("]");`
    case 'double[]':
      return `__out.append("["); for (int __i = 0; __i < ${v}.length; __i++) { if (__i > 0) __out.append(","); __out.append(String.valueOf(${v}[__i])); } __out.append("]");`
    case 'bool[]':
      return `__out.append("["); for (int __i = 0; __i < ${v}.length; __i++) { if (__i > 0) __out.append(","); __out.append(${v}[__i] ? "true" : "false"); } __out.append("]");`
    case 'string[]':
      return `__out.append("["); for (int __i = 0; __i < ${v}.length; __i++) { if (__i > 0) __out.append(","); __out.append(Main.__escapeJson(${v}[__i] == null ? "" : ${v}[__i])); } __out.append("]");`
  }
}

/* ---------- C# ---------- */

function wrapCs(sig: FunctionSignature, userCode: string): string {
  const argReads = sig.params
    .map((p, i) => `        ${langType(p.type, 'csharp')} __a${i} = ${csParseExpr(p.type, `__input[${i}]`)};`)
    .join('\n')
  const callArgs = sig.params.map((_, i) => `__a${i}`).join(', ')
  const printCall = csJsonWriter(sig.returnType, '__r')
  // C# 의 using 은 파일 상단이어야 하므로 사용자 코드보다 '먼저' 위치.
  return `using System;
using System.Collections.Generic;
using System.Linq;
using System.IO;
using System.Text;

/* ---------- USER CODE ---------- */
${userCode}
/* ---------- END USER CODE ---------- */

public class Program {
    public static void Main() {
        var __lines = new List<string>();
        string? __ln;
        while ((__ln = Console.In.ReadLine()) != null) { if (!string.IsNullOrEmpty(__ln)) __lines.Add(__ln); }
        string[] __input = __lines.ToArray();

${argReads}

        var __sol = new Solution();
        var __r = __sol.${sig.functionName}(${callArgs});

        var __out = new StringBuilder();
        __out.Append((char)0x1e).Append("__RESULT__:");
        ${printCall}
        __out.Append(":__END__").Append((char)0x1e);
        Console.Write(__out.ToString());
    }

    public static string __ParseString(string s) {
        if (s == null || s.Length < 2) return "";
        var b = new StringBuilder();
        for (int i = 1; i < s.Length - 1; i++) {
            char c = s[i];
            if (c == '\\\\' && i + 1 < s.Length - 1) {
                char n = s[++i];
                switch (n) {
                    case 'n': b.Append('\\n'); break;
                    case 't': b.Append('\\t'); break;
                    case 'r': b.Append('\\r'); break;
                    case '"': b.Append('"'); break;
                    case '\\\\': b.Append('\\\\'); break;
                    case '/': b.Append('/'); break;
                    case 'u':
                        if (i + 4 < s.Length) {
                            string hex = s.Substring(i + 1, 4);
                            b.Append((char)Convert.ToInt32(hex, 16));
                            i += 4;
                        }
                        break;
                    default: b.Append(n); break;
                }
            } else {
                b.Append(c);
            }
        }
        return b.ToString();
    }

    public static string[] __SplitJsonArray(string s) {
        string body = s.Trim();
        body = body.Substring(1, body.Length - 2).Trim();
        if (body.Length == 0) return new string[0];
        var parts = new List<string>();
        int depth = 0; bool inStr = false; bool esc = false;
        var cur = new StringBuilder();
        for (int i = 0; i < body.Length; i++) {
            char c = body[i];
            if (esc) { cur.Append(c); esc = false; continue; }
            if (inStr) {
                cur.Append(c);
                if (c == '\\\\') esc = true;
                else if (c == '"') inStr = false;
                continue;
            }
            if (c == '"') { inStr = true; cur.Append(c); continue; }
            if (c == '[') { depth++; cur.Append(c); continue; }
            if (c == ']') { depth--; cur.Append(c); continue; }
            if (c == ',' && depth == 0) { parts.Add(cur.ToString().Trim()); cur.Clear(); continue; }
            cur.Append(c);
        }
        if (cur.Length > 0) parts.Add(cur.ToString().Trim());
        return parts.ToArray();
    }

    public static string __EscapeJson(string s) {
        var b = new StringBuilder("\\"");
        foreach (char c in s) {
            switch (c) {
                case '\\\\': b.Append("\\\\\\\\"); break;
                case '"': b.Append("\\\\\\""); break;
                case '\\n': b.Append("\\\\n"); break;
                case '\\r': b.Append("\\\\r"); break;
                case '\\t': b.Append("\\\\t"); break;
                default:
                    if (c < 0x20) b.Append(string.Format("\\\\u{0:x4}", (int)c));
                    else b.Append(c);
                    break;
            }
        }
        b.Append('\\"');
        return b.ToString();
    }
}
`
}

function csParseExpr(t: ParamType, src: string): string {
  switch (t) {
    case 'int':
      return `int.Parse(${src}.Trim())`
    case 'long':
      return `long.Parse(${src}.Trim())`
    case 'double':
      return `double.Parse(${src}.Trim(), System.Globalization.CultureInfo.InvariantCulture)`
    case 'bool':
      return `bool.Parse(${src}.Trim())`
    case 'string':
      return `Program.__ParseString(${src})`
    case 'int[]':
      return `Program.__SplitJsonArray(${src}).Select(x => int.Parse(x.Trim())).ToArray()`
    case 'long[]':
      return `Program.__SplitJsonArray(${src}).Select(x => long.Parse(x.Trim())).ToArray()`
    case 'double[]':
      return `Program.__SplitJsonArray(${src}).Select(x => double.Parse(x.Trim(), System.Globalization.CultureInfo.InvariantCulture)).ToArray()`
    case 'bool[]':
      return `Program.__SplitJsonArray(${src}).Select(x => bool.Parse(x.Trim())).ToArray()`
    case 'string[]':
      return `Program.__SplitJsonArray(${src}).Select(x => Program.__ParseString(x.Trim())).ToArray()`
  }
}

function csJsonWriter(t: ParamType, v: string): string {
  switch (t) {
    case 'int':
    case 'long':
      return `__out.Append(${v}.ToString(System.Globalization.CultureInfo.InvariantCulture));`
    case 'double':
      return `__out.Append(${v}.ToString("R", System.Globalization.CultureInfo.InvariantCulture));`
    case 'bool':
      return `__out.Append(${v} ? "true" : "false");`
    case 'string':
      return `__out.Append(Program.__EscapeJson(${v} ?? ""));`
    case 'int[]':
      return `__out.Append("["); for (int __i = 0; __i < ${v}.Length; __i++) { if (__i > 0) __out.Append(","); __out.Append(${v}[__i].ToString(System.Globalization.CultureInfo.InvariantCulture)); } __out.Append("]");`
    case 'long[]':
      return `__out.Append("["); for (int __i = 0; __i < ${v}.Length; __i++) { if (__i > 0) __out.Append(","); __out.Append(${v}[__i].ToString(System.Globalization.CultureInfo.InvariantCulture)); } __out.Append("]");`
    case 'double[]':
      return `__out.Append("["); for (int __i = 0; __i < ${v}.Length; __i++) { if (__i > 0) __out.Append(","); __out.Append(${v}[__i].ToString("R", System.Globalization.CultureInfo.InvariantCulture)); } __out.Append("]");`
    case 'bool[]':
      return `__out.Append("["); for (int __i = 0; __i < ${v}.Length; __i++) { if (__i > 0) __out.Append(","); __out.Append(${v}[__i] ? "true" : "false"); } __out.Append("]");`
    case 'string[]':
      return `__out.Append("["); for (int __i = 0; __i < ${v}.Length; __i++) { if (__i > 0) __out.Append(","); __out.Append(Program.__EscapeJson(${v}[__i] ?? "")); } __out.Append("]");`
  }
}

/* ============================================================ *
 *  결과 추출
 *    실행 후 stdout 에서 '\x1e__RESULT__:<json>:__END__\x1e' 를 찾아
 *    JSON.parse(json) 으로 복원합니다.
 *    마커가 없으면 undefined 반환 (예: 함수 정의 실패, 타임아웃 등).
 * ============================================================ */

const RESULT_REGEX = /\x1e__RESULT__:([\s\S]*?):__END__\x1e/

export function extractResult(stdout: string): { value: unknown; found: boolean; leftover: string } {
  const m = stdout.match(RESULT_REGEX)
  if (!m) return { value: undefined, found: false, leftover: stdout }
  const json = m[1] ?? ''
  const leftover = stdout.replace(RESULT_REGEX, '')
  try {
    return { value: JSON.parse(json), found: true, leftover }
  } catch {
    return { value: json, found: true, leftover }
  }
}

/* ============================================================ *
 *  비교 — 느슨한 JSON 동등성
 *    - number vs number : 엡실론 비교 (double 허용)
 *    - array vs array   : 길이 동일 + 원소별 재귀
 *    - object vs object : 키 집합 동일 + 값별 재귀
 *    - 그 외            : ===
 * ============================================================ */

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a === 'number' && typeof b === 'number') {
    if (Number.isNaN(a) && Number.isNaN(b)) return true
    if (!Number.isFinite(a) || !Number.isFinite(b)) return a === b
    const diff = Math.abs(a - b)
    if (diff < 1e-9) return true
    const scale = Math.max(Math.abs(a), Math.abs(b), 1)
    return diff / scale < 1e-6
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false
    return true
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ao = a as Record<string, unknown>
    const bo = b as Record<string, unknown>
    const ak = Object.keys(ao).sort()
    const bk = Object.keys(bo).sort()
    if (ak.length !== bk.length) return false
    for (let i = 0; i < ak.length; i++) {
      if (ak[i] !== bk[i]) return false
      if (!deepEqual(ao[ak[i]], bo[bk[i]])) return false
    }
    return true
  }
  return false
}

/* ============================================================ *
 *  표시용 유틸
 * ============================================================ */

export function formatValue(v: unknown): string {
  if (v === undefined) return '(없음)'
  if (v === null) return 'null'
  if (typeof v === 'string') return JSON.stringify(v)
  if (Array.isArray(v)) return JSON.stringify(v)
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

export function formatCall(sig: FunctionSignature, args: unknown[]): string {
  return `${sig.functionName}(${args.map(formatValue).join(', ')})`
}

export { type Param }
