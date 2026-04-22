import type { MouseEvent, ReactNode } from 'react'
import { useEffect, useRef } from 'react'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export default function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  // 드래그가 모달 내부에서 시작됐는지 추적.
  // true 면 backdrop 위에서 mouseup 되어도 닫지 않는다
  // (예: input 안에서 텍스트를 드래그 선택하다가 바깥에서 놓는 경우).
  const dragStartedInsideRef = useRef(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const handleBackdropMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    dragStartedInsideRef.current = e.target !== e.currentTarget
  }

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    if (dragStartedInsideRef.current) {
      dragStartedInsideRef.current = false
      return
    }
    onClose()
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      <div
        className={`modal modal-${size}`}
        role="dialog"
        aria-modal="true"
      >
        <header className="modal-head">
          <h2>{title}</h2>
          <button
            type="button"
            className="modal-close"
            aria-label="닫기"
            onClick={onClose}
          >
            ✕
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}
