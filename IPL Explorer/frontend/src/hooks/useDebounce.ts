import { useState, useEffect } from 'react'

/**
 * Delays updating the returned value until the input hasn't changed
 * for `delay` milliseconds. Prevents firing API calls on every keystroke.
 *
 * Usage:
 *   const debouncedQuery = useDebounce(query, 300)
 *   useEffect(() => { if (debouncedQuery) search(debouncedQuery) }, [debouncedQuery])
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
