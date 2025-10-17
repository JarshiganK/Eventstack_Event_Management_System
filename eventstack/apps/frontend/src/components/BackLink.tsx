import { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

type Props = {
  fallback?: string
  children?: ReactNode
  variant?: 'default' | 'light'
  className?: string
}

export default function BackLink({
  fallback = '/',
  children = 'Back',
  variant = 'default',
  className = '',
}: Props) {
  const navigate = useNavigate()

  function handleClick() {
    if (window.history.length > 2) {
      navigate(-1)
      return
    }
    navigate(fallback, { replace: true })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`back-link${variant === 'light' ? ' back-link--light' : ''}${className ? ` ${className}` : ''}`}
    >
      <span className="back-link__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M14.7 6.3a1 1 0 0 0-1.4 0L7.3 12.3a1 1 0 0 0 0 1.4l6 6a1 1 0 1 0 1.4-1.4L9.42 13l5.3-5.3a1 1 0 0 0-0.02-1.4z" />
        </svg>
      </span>
      <span>{children}</span>
    </button>
  )
}

