import { useEffect, useRef, useState, useCallback } from 'react'

interface DesmosCalculator {
  setExpression: (expr: { id: string; latex: string; color?: string }) => void
  setBlank: () => void
  setMathBounds: (bounds: { left: number; right: number; bottom: number; top: number }) => void
  updateSettings: (settings: { colors?: DesmosColors }) => void
}

interface DesmosColors {
  background: string
  grid: string
  axes: string
}


export interface UseDesmosResult {
  isLoading: boolean
  isReady: boolean
  error: string | null
  calculator: DesmosCalculator | null
  setExpression: (id: string, latex: string, color?: string) => void
  setBlank: () => void
  loadExample: () => void
  updateTheme: (isDark: boolean) => void
}

const DARK_COLORS: DesmosColors = {
  background: '#18241F',
  grid: '#4B6E60',
  axes: '#6B9080',
}

const LIGHT_COLORS: DesmosColors = {
  background: '#EAF4F4',
  grid: '#A4C3B2',
  axes: '#547365',
}

export function useDesmos(containerRef: React.RefObject<HTMLElement | null>, isDark: boolean): UseDesmosResult {
  const [isLoading, setIsLoading] = useState(true)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const calculatorRef = useRef<DesmosCalculator | null>(null)

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        if (!window.Desmos) {
          await loadDesmosScript()
        }
        if (cancelled || !containerRef.current) return

        const calculator = window.Desmos!.GraphingCalculator(containerRef.current, {
          keypad: true,
          expressions: true,
          settingsMenu: true,
          zoomButtons: true,
          expressionsTopbar: true,
          colors: isDark ? DARK_COLORS : LIGHT_COLORS,
        })

        calculator.setExpression({ id: 'default-1', latex: 'y = \\sin(x)', color: '#4A90D9' })
        calculatorRef.current = calculator

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
  }, [])

  const setExpression = useCallback((id: string, latex: string, color?: string) => {
    calculatorRef.current?.setExpression({ id, latex, color })
  }, [])

  const setBlank = useCallback(() => {
    calculatorRef.current?.setBlank()
  }, [])

  const loadExample = useCallback(() => {
    const calc = calculatorRef.current
    if (!calc) return
    calc.setBlank()
    calc.setExpression({ id: 'ex-1', latex: 'f(x) = \\sin(x)', color: '#4A90D9' })
    calc.setExpression({ id: 'ex-2', latex: 'g(x) = \\cos(x)', color: '#E84393' })
    calc.setExpression({ id: 'ex-3', latex: 'h(x) = x^2 - 2', color: '#7ED321' })
    calc.setExpression({ id: 'ex-4', latex: '(x-1)^2 + (y-1)^2 = 4', color: '#F5A623' })
    calc.setExpression({ id: 'ex-5', latex: 'y = \\frac{1}{x}', color: '#BD10E0' })
    calc.setMathBounds({ left: -6, right: 6, bottom: -4, top: 6 })
  }, [])

  const updateTheme = useCallback((dark: boolean) => {
    calculatorRef.current?.updateSettings({
      colors: dark ? DARK_COLORS : LIGHT_COLORS,
    })
  }, [])

  useEffect(() => {
    if (isReady) {
      updateTheme(isDark)
    }
  }, [isDark, isReady, updateTheme])

  return {
    isLoading,
    isReady,
    error,
    calculator: calculatorRef.current,
    setExpression,
    setBlank,
    loadExample,
    updateTheme,
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
    script.onerror = () => reject(new Error('Failed to load Desmos API'))
    document.head.appendChild(script)
  })
}
