import { useCallback, useEffect, useRef, useState } from 'react'
import type { QueryResult } from '../types'

export type { QueryResult }

export function useSqlJs() {
  const [isLoading, setIsLoading] = useState(true)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sqlRef = useRef<unknown>(null)
  const dbRef = useRef<unknown>(null)

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        await loadSqlJsScript()
        if (cancelled) return

        const SQL = await window.initSqlJs!({
          locateFile: (file: string) =>
            `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`,
        })

        if (cancelled) return

        sqlRef.current = SQL
        dbRef.current = new (SQL as { Database: new () => unknown }).Database()

        window.getSharedSqliteDb = () => {
          const db = dbRef.current as { export: () => Uint8Array } | null
          return db?.export() ?? null
        }
        window.setSharedSqliteDb = (data: Uint8Array) => {
          const SQL2 = sqlRef.current as { Database: new (data: Uint8Array) => unknown } | null
          if (!SQL2) return
          const db = dbRef.current as { close: () => void } | null
          db?.close()
          dbRef.current = new SQL2.Database(data)
        }

        if (!cancelled) {
          setIsReady(true)
          setIsLoading(false)
        }
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
    }
  }, [])

  const execute = useCallback((sql: string): QueryResult[] | null => {
    const db = dbRef.current as { exec: (sql: string) => { columns: string[]; values: (string | number | null)[][] }[] } | null
    if (!db) return null
    try {
      return db.exec(sql)
    } catch {
      return null
    }
  }, [])

  const exportDb = useCallback((): Uint8Array | null => {
    const db = dbRef.current as { export: () => Uint8Array } | null
    if (!db) return null
    return db.export()
  }, [])

  const importDb = useCallback((data: Uint8Array) => {
    const SQL = sqlRef.current as { Database: new (data: Uint8Array) => unknown } | null
    if (!SQL) return
    const db = dbRef.current as { close: () => void } | null
    db?.close()
    dbRef.current = new SQL.Database(data)
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
