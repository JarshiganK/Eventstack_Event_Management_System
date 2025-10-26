import { useEffect, useRef } from 'react'

export function useDebounce<T>(value: T, delayMs: number, onDebounced: (v: T) => void) {
  const ref = useRef<number | undefined>(undefined)
  useEffect(() => {
    window.clearTimeout(ref.current)
    ref.current = window.setTimeout(() => onDebounced(value), delayMs)
    return () => window.clearTimeout(ref.current)
  }, [value, delayMs, onDebounced])
}


