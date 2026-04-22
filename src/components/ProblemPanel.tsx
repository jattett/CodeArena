import type { Difficulty, Language, Problem } from '../types'
import { formatCall, formatValue, langType, signaturePreview } from '../lib/signatures'

interface ProblemPanelProps {
  problem: Problem | null
  language: Language
}

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  trivial: 'LV.0',
  easy: 'EASY',
  medium: 'MEDIUM',
  hard: 'HARD',
}

export default function ProblemPanel({ problem, language }: ProblemPanelProps) {
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

  const { signature } = problem

  return (
    <div className="problem-panel">
      <div className="problem-head">
        <h2>{problem.title}</h2>
        <span className={`difficulty ${problem.difficulty}`}>
          {DIFFICULTY_LABEL[problem.difficulty]}
        </span>
      </div>
      <div className="problem-description">{problem.description}</div>

      <section className="signature-section">
        <h3 className="section-title">함수 시그니처</h3>
        <code className="signature-preview">{signaturePreview(signature, language)}</code>
        {signature.params.length > 0 && (
          <table className="signature-table">
            <thead>
              <tr>
                <th>매개변수</th>
                <th>타입</th>
                <th>설명</th>
              </tr>
            </thead>
            <tbody>
              {signature.params.map((p) => (
                <tr key={p.name}>
                  <td><code>{p.name}</code></td>
                  <td><code>{langType(p.type, language)}</code></td>
                  <td>{p.description ?? ''}</td>
                </tr>
              ))}
              <tr className="return-row">
                <td>return</td>
                <td><code>{langType(signature.returnType, language)}</code></td>
                <td>반환값</td>
              </tr>
            </tbody>
          </table>
        )}
      </section>

      <section className="examples">
        <h3 className="section-title">입출력 예</h3>
        <div className="examples-body">
          {problem.samples.map((tc, i) => (
            <div key={i} className="example-item">
              <div className="lbl">{tc.name} · 호출</div>
              <pre className="example-call">{formatCall(signature, tc.args)}</pre>
              <div className="lbl">반환 (return)</div>
              <pre className="example-return">{formatValue(tc.expected)}</pre>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
