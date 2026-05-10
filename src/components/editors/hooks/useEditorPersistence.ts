import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEYS = {
  python: 'tolaria-editor-python-code',
  sqlite: 'tolaria-editor-sqlite-code',
  cpp: 'tolaria-editor-cpp-code',
} as const

export function usePersistentCode(editor: 'python' | 'sqlite' | 'cpp', defaultCode: string): [string, (code: string) => void] {
  const key = STORAGE_KEYS[editor]

  const [code, setCodeState] = useState<string>(() => {
    try {
      return localStorage.getItem(key) ?? defaultCode
    } catch {
      return defaultCode
    }
  })

  const setCode = useCallback((next: string) => {
    setCodeState(next)
    try {
      localStorage.setItem(key, next)
    } catch {
      // Ignore storage errors.
    }
  }, [key])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored !== null) setCodeState(stored)
    } catch {
      // Ignore storage errors.
    }
  }, [key])

  return [code, setCode]
}
