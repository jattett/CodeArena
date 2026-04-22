import type { Difficulty, Problem } from '../types'

interface ProblemPanelProps {
  problem: Problem | null
}

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  trivial: 'LV.0',
  easy: 'EASY',
  medium: 'MEDIUM',
  hard: 'HARD',
}

export default function ProblemPanel({ problem }: ProblemPanelProps) {
  if (!problem) {
    return (
      <div className="problem-panel">
        <div className="problem-head">
          <h2>문제를 선택하세요</h2>
        </div>
        <div className="problem-description">왼쪽에서 풀고 싶은 문제를 선택해주세요.</div>
      </div>
    )
  }

  return (
    <div className="problem-panel">
      <div className="problem-head">
        <h2>{problem.title}</h2>
        <span className={`difficulty ${problem.difficulty}`}>
          {DIFFICULTY_LABEL[problem.difficulty]}
        </span>
      </div>
      <div className="problem-description">{problem.description}</div>

      <details className="examples" open>
        <summary>입출력 예시</summary>
        <div className="examples-body">
          {problem.sampleTests.map((tc, i) => (
            <div key={i} className="example-item">
              <div className="lbl">{tc.name} · 입력</div>
              <pre>{tc.stdin}</pre>
              <div className="lbl">기대 출력</div>
              <pre>{tc.expected}</pre>
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}
