import { useEffect, useRef, useState, useCallback } from 'react'

interface SqlJsStatic {
  Database: new (data?: Uint8Array) => Database
}

interface Database {
  exec: (sql: string) => QueryResult[]
  export: () => Uint8Array
  close: () => void
}

export interface QueryResult {
  columns: string[]
  values: (string | number | null)[][]
}

interface SqlJsWindow extends Window {
  initSqlJs?: (config: { locateFile: (file: string) => string }) => Promise<SqlJsStatic>
}

declare const window: SqlJsWindow

export interface UseSqlJsResult {
  isLoading: boolean
  isReady: boolean
  error: string | null
  execute: (sql: string) => QueryResult[] | null
  exportDb: () => Uint8Array | null
  importDb: (data: Uint8Array) => void
}

export function useSqlJs(): UseSqlJsResult {
  const [isLoading, setIsLoading] = useState(true)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sqlRef = useRef<SqlJsStatic | null>(null)
  const dbRef = useRef<Database | null>(null)

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        if (!window.initSqlJs) {
          await loadSqlJsScript()
        }
        if (cancelled) return

        const SQL = await window.initSqlJs!({
          locateFile: (file: string) =>
            `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`,
        })

        if (cancelled) return

        sqlRef.current = SQL
        dbRef.current = new SQL.Database()
        setIsReady(true)
        setIsLoading(false)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load SQL.js')
          setIsLoading(false)
        }
      }
    }

    init()

    return () => {
      cancelled = true
      dbRef.current?.close()
    }
  }, [])

  const execute = useCallback((sql: string): QueryResult[] | null => {
    if (!dbRef.current) return null
    try {
      return dbRef.current.exec(sql)
    } catch {
      return null
    }
  }, [])

  const exportDb = useCallback((): Uint8Array | null => {
    if (!dbRef.current) return null
    return dbRef.current.export()
  }, [])

  const importDb = useCallback((data: Uint8Array) => {
    if (!sqlRef.current) return
    dbRef.current?.close()
    dbRef.current = new sqlRef.current.Database(data)
  }, [])

  return {
    isLoading,
    isReady,
    error,
    execute,
    exportDb,
    importDb,
  }
}

function loadSqlJsScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.initSqlJs) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load SQL.js'))
    document.head.appendChild(script)
  })
}
