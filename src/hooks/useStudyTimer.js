import { useRef, useEffect } from 'react'
import { recordStudySession } from '../utils/progressStore'

export function useStudyTimer() {
  const startTimeRef = useRef(null)

  // start tracking
  const start = () => {
    startTimeRef.current = Date.now()
  }

  // stop tracking
  const stop = () => {
    if (!startTimeRef.current) return

    const durationMs = Date.now() - startTimeRef.current
    const hours = durationMs / (1000 * 60 * 60)

    if (hours > 0.01) { // ignore tiny sessions
      recordStudySession(hours)
    }

    startTimeRef.current = null
  }

  // auto stop when tab closes
  useEffect(() => {
    const handleUnload = () => stop()
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [])

  return { start, stop }
}