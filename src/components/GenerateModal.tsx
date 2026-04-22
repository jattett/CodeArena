import { useEffect, useState } from 'react'
import Modal from './Modal'
import type { Difficulty, GenerateRequest } from '../types'

interface Props {
  open: boolean
  loading: boolean
  hasKey: boolean
  error: string | null
  /** 현재 진행 중인 배치의 진행도. loading=true 일 때만 의미 있음. */
  progress?: { current: number; total: number } | null
  onClose: () => void
  onGenerate: (req: GenerateRequest) => void
  onOpenSettings: () => void
}

const DIFFICULTIES: Array<{ id: Difficulty; label: string }> = [
  { id: 'trivial', label: '입문 (Lv.0)' },
  { id: 'easy', label: '쉬움 (Lv.1)' },
  { id: 'medium', label: '보통 (Lv.2)' },
  { id: 'hard', label: '어려움 (Lv.2~3)' },
]

const TOPIC_PRESETS = [
  '문자열 처리',
  '배열 / 리스트',
  '정렬',
  '해시맵 / 집합',
  '수학 / 수식',
  '구현',
  '그리디',
  '완전 탐색',
  '재귀',
  '스택 / 큐',
  '투 포인터',
  '다이나믹 프로그래밍',
]

export default function GenerateModal({
  open,
  loading,
  hasKey,
  error,
  progress,
  onClose,
  onGenerate,
  onOpenSettings,
}: Props) {
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [constraints, setConstraints] = useState('')
  const [hiddenTestCount, setHiddenTestCount] = useState(4)
  const [problemCount, setProblemCount] = useState(1)

  useEffect(() => {
    if (open) {
      setTopic('')
      setDifficulty('easy')
      setConstraints('')
      setHiddenTestCount(4)
      setProblemCount(1)
    }
  }, [open])

  const handleSubmit = () => {
    onGenerate({
      topic: topic.trim(),
      difficulty,
      constraints: constraints.trim(),
      hiddenTestCount,
      problemCount,
    })
  }

  return (
    <Modal
      open={open}
      title="🤖 AI에게 문제 받기"
      size="lg"
      onClose={loading ? () => {} : onClose}
      footer={
        <>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={loading}
          >
            취소
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading || !hasKey}
          >
            {loading
              ? progress && progress.total > 1
                ? `생성 중... (${progress.current}/${progress.total})`
                : '생성 중...'
              : problemCount > 1
                ? `✨ ${problemCount}개 생성하기`
                : '✨ 생성하기'}
          </button>
        </>
      }
    >
      {!hasKey && (
        <div className="form-warning">
          먼저 OpenAI 인증을 완료해야 합니다 (ChatGPT 로그인 또는 API 키).{' '}
          <button type="button" className="link-btn" onClick={onOpenSettings}>
            지금 설정하기 →
          </button>
        </div>
      )}

      <div className="form-row">
        <label className="form-label">
          주제
          <span className="form-hint">
            자유롭게 입력하거나 아래 프리셋을 클릭하세요. 비워두면 AI가 알아서 고릅니다.
          </span>
        </label>
        <input
          type="text"
          className="text-input"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="예: 이진 탐색, 정렬, 스택 ..."
          disabled={loading}
        />
        <div className="chip-list">
          {TOPIC_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              className={`chip ${topic === p ? 'active' : ''}`}
              onClick={() => setTopic(p)}
              disabled={loading}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="form-row">
        <label className="form-label">난이도</label>
        <div className="radio-group">
          {DIFFICULTIES.map((d) => (
            <label key={d.id} className={`radio-pill ${difficulty === d.id ? 'active' : ''}`}>
              <input
                type="radio"
                name="difficulty"
                value={d.id}
                checked={difficulty === d.id}
                onChange={() => setDifficulty(d.id)}
                disabled={loading}
              />
              {d.label}
            </label>
          ))}
        </div>
      </div>

      <div className="form-grid-2">
        <div className="form-row">
          <label className="form-label">
            문제 개수
            <span className="form-hint">1 ~ 10개 · 순서대로 N번 호출합니다</span>
          </label>
          <input
            type="number"
            min={1}
            max={10}
            className="text-input"
            value={problemCount}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10)
              setProblemCount(Number.isFinite(n) ? Math.min(10, Math.max(1, n)) : 1)
            }}
            disabled={loading}
          />
        </div>

        <div className="form-row">
          <label className="form-label">
            히든 테스트 개수
            <span className="form-hint">문제당 · 3 ~ 8개 권장</span>
          </label>
          <input
            type="number"
            min={1}
            max={10}
            className="text-input"
            value={hiddenTestCount}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10)
              setHiddenTestCount(Number.isFinite(n) ? Math.min(10, Math.max(1, n)) : 4)
            }}
            disabled={loading}
          />
        </div>
      </div>

      <div className="form-row">
        <label className="form-label">
          추가 제약 / 요구사항 (선택)
          <span className="form-hint">예: "N이 10^6 이하", "정렬된 입력", "한국어로 설명"</span>
        </label>
        <textarea
          className="text-input"
          rows={3}
          value={constraints}
          onChange={(e) => setConstraints(e.target.value)}
          placeholder="자유롭게 요청하세요..."
          disabled={loading}
        />
      </div>

      {error && <div className="form-error">⚠️ {error}</div>}

      {loading && (
        <div className="form-loading">
          <div className="spinner" />
          <div className="form-loading-body">
            {progress && progress.total > 1
              ? `문제 ${progress.current} / ${progress.total} 생성 중...`
              : '문제를 생성하고 있습니다. 10~30초 정도 소요될 수 있습니다...'}
            {progress && progress.total > 1 && (
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${Math.round((progress.current / progress.total) * 100)}%`,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
