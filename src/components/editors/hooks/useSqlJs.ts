import { useCallback, useEffect, useRef, useState } from 'react'
import type { QueryResult } from '../types'

export type { QueryResult }

/** Module-level singletons — survive component remounts. */
let sqlSingleton: unknown = null
let dbSingleton: unknown = null
let sqlInitPromise: Promise<void> | null = null

function registerWindowHelpers() {
  window.getSharedSqliteDb = () => {
    const db = dbSingleton as { export: () => Uint8Array } | null
    return db?.export() ?? null
  }
  window.setSharedSqliteDb = (data: Uint8Array) => {
    const SQL = sqlSingleton as { Database: new (data: Uint8Array) => unknown } | null
    if (!SQL) return
    const db = dbSingleton as { close: () => void } | null
    db?.close()
    dbSingleton = new SQL.Database(data)
  }
}

async function getOrInitSqlJs(): Promise<void> {
  if (sqlSingleton) return
  if (sqlInitPromise) return sqlInitPromise

  sqlInitPromise = (async () => {
    await loadSqlJsScript()
    const SQL = await window.initSqlJs!({
      locateFile: (file: string) =>
        `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`,
    })
    sqlSingleton = SQL
    dbSingleton = new (SQL as { Database: new () => unknown }).Database()
    registerWindowHelpers()
  })()

  return sqlInitPromise
}

export function useSqlJs() {
  const [isLoading, setIsLoading] = useState(() => sqlSingleton === null)
  const [isReady, setIsReady] = useState(() => sqlSingleton !== null)
  const [error, setError] = useState<string | null>(null)
  const sqlRef = useRef<unknown>(sqlSingleton)
  const dbRef = useRef<unknown>(dbSingleton)

  useEffect(() => {
    if (sqlSingleton) {
      sqlRef.current = sqlSingleton
      dbRef.current = dbSingleton
      registerWindowHelpers()
      return
    }

    let cancelled = false

    getOrInitSqlJs()
      .then(() => {
        if (cancelled) return
        sqlRef.current = sqlSingleton
        dbRef.current = dbSingleton
        setIsReady(true)
        setIsLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        sqlInitPromise = null
        setError(err instanceof Error ? err.message : 'Failed to load SQL.js')
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const execute = useCallback((sql: string): QueryResult[] | null => {
    const db = (dbSingleton ?? dbRef.current) as { exec: (sql: string) => { columns: string[]; values: (string | number | null)[][] }[] } | null
    if (!db) return null
    try {
      return db.exec(sql)
    } catch {
      return null
    }
  }, [])

  const exportDb = useCallback((): Uint8Array | null => {
    const db = (dbSingleton ?? dbRef.current) as { export: () => Uint8Array } | null
    if (!db) return null
    return db.export()
  }, [])

  const importDb = useCallback((data: Uint8Array) => {
    const SQL = (sqlSingleton ?? sqlRef.current) as { Database: new (data: Uint8Array) => unknown } | null
    if (!SQL) return
    const db = (dbSingleton ?? dbRef.current) as { close: () => void } | null
    db?.close()
    dbSingleton = new SQL.Database(data)
    dbRef.current = dbSingleton
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
