import { useCallback, useEffect, useRef, useState } from 'react'

type DesmosCalculator = {
  setExpression: (expr: { id: string; latex: string; color?: string }) => void
  setBlank: () => void
  setMathBounds: (bounds: { left: number; right: number; bottom: number; top: number }) => void
  updateSettings: (settings: { colors?: unknown }) => void
}

export function useDesmos(containerRef: React.RefObject<HTMLDivElement | null>, isDark: boolean) {
  const [isLoading, setIsLoading] = useState(true)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const calcRef = useRef<DesmosCalculator | null>(null)

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        await loadDesmosScript()
        if (cancelled || !containerRef.current) return

        const calc = window.Desmos!.GraphingCalculator(containerRef.current, {
          keypad: false,
          expressionsCollapsed: false,
          border: false,
          settingsMenu: false,
        })

        calcRef.current = calc

        if (!cancelled) {
          setIsReady(true)
          setIsLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load Desmos')
          setIsLoading(false)
        }
      }
    }

    init()

    return () => {
      cancelled = true
    }
  }, [containerRef])

  useEffect(() => {
    if (!calcRef.current || !isReady) return
    // Theme update — Desmos doesn't have a native dark mode API,
    // so we update the background via the container element directly.
    if (containerRef.current) {
      containerRef.current.style.backgroundColor = isDark ? '#1F1E1B' : '#FFFFFF'
    }
  }, [isDark, isReady, containerRef])

  const loadExample = useCallback(() => {
    const calc = calcRef.current
    if (!calc) return
    calc.setBlank()
    calc.setExpression({ id: 'f', latex: 'y = \\sin(x)', color: '#155DFF' })
    calc.setExpression({ id: 'g', latex: 'y = \\cos(x)', color: '#38A169' })
    calc.setMathBounds({ left: -10, right: 10, bottom: -3, top: 3 })
  }, [])

  const setBlank = useCallback(() => {
    calcRef.current?.setBlank()
  }, [])

  return {
    isLoading,
    isReady,
    error,
    loadExample,
    setBlank,
  }
}

function loadDesmosScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Desmos) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://www.desmos.com/api/v1.8/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Desmos'))
    document.head.appendChild(script)
  })
}
