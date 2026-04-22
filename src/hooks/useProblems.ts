import { useCallback, useEffect, useMemo, useState } from 'react'
import { PROBLEMS as BUILTIN } from '../data/problems'
import type { Problem } from '../types'

const STORAGE_KEY = 'codearena.problems.generated.v1'

function loadGenerated(): Problem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Problem[]
    return Array.isArray(parsed) ? parsed : []
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
