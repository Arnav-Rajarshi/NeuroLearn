import { createContext, useContext, useState, useCallback, useRef } from 'react'

/**
 * TransitionContext
 *
 * Phase state machine:
 *   idle → uplink → intense → collapse → waiting → reveal → complete
 *
 * The "waiting" phase is NEW — the overlay stays alive, cycling a subtle
 * hold animation, until the destination page calls `signalDataReady()`.
 * Only then does the overlay play its final reveal + fade-out.
 */

const TransitionContext = createContext(null)

export function TransitionProvider({ children }) {
  const [phase, setPhase] = useState('idle')
  const [isVisible, setIsVisible] = useState(false)

  // Refs so callbacks are never stale inside timeouts
  const navigationCallbackRef = useRef(null)
  const dataReadyRef = useRef(false)
  const waitingResolveRef = useRef(null)

  // Internal: play the reveal + unmount
  const playReveal = useCallback(() => {
    setPhase('reveal')
    setTimeout(() => {
      setPhase('complete')
      setIsVisible(false)
      dataReadyRef.current = false
      waitingResolveRef.current = null
    }, 750)
  }, [])

  /**
   * triggerTransition — call when user clicks Dashboard button.
   * @param {Function} navigateFn
   */
  const triggerTransition = useCallback((navigateFn) => {
    navigationCallbackRef.current = navigateFn
    dataReadyRef.current = false
    setIsVisible(true)
    setPhase('uplink')

    const t1 = setTimeout(() => setPhase('intense'), 1400)
    const t2 = setTimeout(() => setPhase('collapse'), 2400)

    const t3 = setTimeout(() => {
      if (navigationCallbackRef.current) {
        navigationCallbackRef.current()
        navigationCallbackRef.current = null
      }
      setPhase('waiting')

      if (dataReadyRef.current) {
        playReveal()
      } else {
        waitingResolveRef.current = playReveal
      }
    }, 2950)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [playReveal])

  /**
   * signalDataReady — call from PerformanceDashboard when fetch completes.
   * Safe to call multiple times.
   */
  const signalDataReady = useCallback(() => {
    if (dataReadyRef.current) return
    dataReadyRef.current = true

    if (waitingResolveRef.current) {
      waitingResolveRef.current()
      waitingResolveRef.current = null
    }
  }, [])

  const resetTransition = useCallback(() => {
    setPhase('idle')
    setIsVisible(false)
    dataReadyRef.current = false
    waitingResolveRef.current = null
    navigationCallbackRef.current = null
  }, [])

  return (
    <TransitionContext.Provider
      value={{ phase, isVisible, triggerTransition, signalDataReady, resetTransition }}
    >
      {children}
    </TransitionContext.Provider>
  )
}

export function useTransition() {
  const ctx = useContext(TransitionContext)
  if (!ctx) throw new Error('useTransition must be used within TransitionProvider')
  return ctx
}
