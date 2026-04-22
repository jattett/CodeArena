import { useCallback, useEffect, useMemo, useState } from 'react'
import { PROBLEMS as BUILTIN } from '../data/problems'
import type { Problem } from '../types'

// v2: 프로그래머스 스타일 함수형 스키마로 전환 — 기존 stdin 기반 문제는 자동 폐기.
const STORAGE_KEY = 'codearena.problems.generated.v2'
const LEGACY_STORAGE_KEYS = ['codearena.problems.generated.v1']

function loadGenerated(): Problem[] {
  // 예전 버전 제거 — 더 이상 사용하지 않는 stdin 기반 데이터.
  for (const k of LEGACY_STORAGE_KEYS) {
    try { localStorage.removeItem(k) } catch { /* noop */ }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Problem[]
    if (!Array.isArray(parsed)) return []
    // 방어적 검증: signature 가 없는 항목은 이상하므로 제거.
    return parsed.filter((p) => p && typeof p === 'object' && !!p.signature)
  } catch {
    return []
  }
}

function saveGenerated(list: Problem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* noop */
  }
}

export interface UseProblemsReturn {
  builtin: Problem[]
  generated: Problem[]
  all: Problem[]
  findById: (id: string) => Problem | undefined
  addGenerated: (p: Problem) => void
  removeGenerated: (id: string) => void
  clearGenerated: () => void
}

export function useProblems(): UseProblemsReturn {
  const [generated, setGenerated] = useState<Problem[]>(() => loadGenerated())

  useEffect(() => {
    saveGenerated(generated)
  }, [generated])

  const builtin: Problem[] = useMemo(
    () => BUILTIN.map((p) => ({ ...p, source: 'builtin' as const })),
    [],
  )

  const all = useMemo<Problem[]>(() => [...generated, ...builtin], [generated, builtin])

  const findById = useCallback(
    (id: string) => all.find((p) => p.id === id),
    [all],
  )

  const addGenerated = useCallback((p: Problem) => {
    setGenerated((prev) => {
      const dedup = prev.filter((x) => x.id !== p.id)
      return [p, ...dedup]
    })
  }, [])

  const removeGenerated = useCallback((id: string) => {
    setGenerated((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const clearGenerated = useCallback(() => {
    setGenerated([])
  }, [])

  return { builtin, generated, all, findById, addGenerated, removeGenerated, clearGenerated }
}
