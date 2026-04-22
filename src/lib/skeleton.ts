import type { FunctionSignature, Language, StarterCodes } from '../types'
import { buildSkeleton } from './signatures'

/**
 * signature 기반 — 프로그래머스 스타일의 "빈 함수 하나"만 담긴 스켈레톤을 4 언어에 대해 생성합니다.
 */
export function skeletonFromSignature(sig: FunctionSignature): StarterCodes {
  return {
    javascript: buildSkeleton(sig, 'javascript'),
    python: buildSkeleton(sig, 'python'),
    java: buildSkeleton(sig, 'java'),
    csharp: buildSkeleton(sig, 'csharp'),
  }
}

/** 기본 시그니처: solution(a, b) -> int — AI 생성 실패 / 폴백 용. */
export const FALLBACK_SIGNATURE: FunctionSignature = {
  functionName: 'solution',
  params: [
    { name: 'a', type: 'int' },
    { name: 'b', type: 'int' },
  ],
  returnType: 'int',
}

export function defaultSkeleton(lang: Language): string {
  return buildSkeleton(FALLBACK_SIGNATURE, lang)
}

export function defaultSkeletonAll(): StarterCodes {
  return skeletonFromSignature(FALLBACK_SIGNATURE)
}
