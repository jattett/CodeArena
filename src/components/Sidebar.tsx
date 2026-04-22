import type { Difficulty, Problem } from '../types'

interface SidebarProps {
  builtin: Problem[]
  generated: Problem[]
  selectedId: string
  onSelect: (id: string) => void
  onGenerate: () => void
  onRemoveGenerated: (id: string) => void
}

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  trivial: 'Lv.0',
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

interface ProblemItemProps {
  problem: Problem
  index: number
  selected: boolean
  onSelect: () => void
  onDelete?: () => void
}

function ProblemItem({ problem, index, selected, onSelect, onDelete }: ProblemItemProps) {
  return (
    <li className={selected ? 'active' : ''} onClick={onSelect}>
      <span className="p-title">
        {String(index + 1).padStart(2, '0')}. {problem.title}
      </span>
      <span className="p-right">
        <span className={`difficulty ${problem.difficulty}`}>
          {DIFFICULTY_LABEL[problem.difficulty]}
        </span>
        {onDelete && (
          <button
            type="button"
            className="icon-btn"
            title="삭제"
            onClick={(e) => {
              e.stopPropagation()
              if (confirm(`'${problem.title}' 문제를 삭제할까요?`)) onDelete()
            }}
          >
            ✕
          </button>
        )}
      </span>
    </li>
  )
}

export default function Sidebar({
  builtin,
  generated,
  selectedId,
  onSelect,
  onGenerate,
  onRemoveGenerated,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <button type="button" className="btn btn-primary btn-block" onClick={onGenerate}>
        ✨ AI 문제 생성
      </button>

      {generated.length > 0 && (
        <div className="sidebar-section">
          <h2>
            AI 생성 <span className="count">{generated.length}</span>
          </h2>
          <ul className="problem-list">
            {generated.map((p, i) => (
              <ProblemItem
                key={p.id}
                problem={p}
                index={i}
                selected={selectedId === p.id}
                onSelect={() => onSelect(p.id)}
                onDelete={() => onRemoveGenerated(p.id)}
              />
            ))}
          </ul>
        </div>
      )}

      <div className="sidebar-section">
        <h2>기본 문제</h2>
        <ul className="problem-list">
          {builtin.map((p, i) => (
            <ProblemItem
              key={p.id}
              problem={p}
              index={i}
              selected={selectedId === p.id}
              onSelect={() => onSelect(p.id)}
            />
          ))}
        </ul>
      </div>
    </aside>
  )
}
