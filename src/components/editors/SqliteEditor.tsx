import { useCallback, useEffect, useRef, useState } from 'react'
import { Database, Play, Trash } from '@phosphor-icons/react'
import { Button } from '../ui/button'
import { useSqlJs, type QueryResult } from './hooks/useSqlJs'
import { githubDark } from '@uiw/codemirror-theme-github'
import { githubLight } from '@uiw/codemirror-theme-github'
import { sql } from '@codemirror/lang-sql'
import CodeMirror from '@uiw/react-codemirror'
import { useDocumentThemeMode } from '../../hooks/useDocumentThemeMode'
import { translate, type AppLocale } from '../../lib/i18n'

interface SqliteEditorProps {
  locale: AppLocale
}

const DEFAULT_CODE = `-- Create a sample table
CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, role TEXT);
INSERT INTO employees (name, role) VALUES ('Alice', 'Engineer'), ('Bob', 'Designer');

-- Select data
SELECT * FROM employees;`

export function SqliteEditor({ locale }: SqliteEditorProps) {
  const { isLoading, isReady, error, execute } = useSqlJs()
  const [code, setCode] = useState(DEFAULT_CODE)
  const [results, setResults] = useState<QueryResult[]>([])
  const [execError, setExecError] = useState<string | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const outputRef = useRef<HTMLDivElement | null>(null)
  const theme = useDocumentThemeMode()
  const isDark = theme === 'dark'

  useEffect(() => {
    window.getSqliteCode = () => code
    window.setSqliteCode = (newCode: string) => setCode(newCode)
  }, [code])

  const handleExecute = useCallback(() => {
    setIsExecuting(true)
    setExecError(null)

    setTimeout(() => {
      const result = execute(code)
      if (result === null) {
        setExecError('Execution failed')
      } else {
        setResults(result)
      }
      setIsExecuting(false)

      setTimeout(() => {
        outputRef.current?.scrollTo(0, outputRef.current.scrollHeight)
      }, 50)
    }, 50)
  }, [code, execute])

  const handleClear = useCallback(() => {
    setResults([])
    setExecError(null)
  }, [])

  const renderTable = (columns: string[], values: (string | number | null)[][]) => {
    if (!columns.length) {
      return <p className="text-sm text-muted-foreground italic">No rows returned.</p>
    }

    return (
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-muted">
            {columns.map((col) => (
              <th key={col} className="border border-border px-2 py-1 text-left font-medium">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {values.map((row, idx) => (
            <tr key={idx}>
              {row.map((val, vidx) => (
                <td key={vidx} className="border border-border px-2 py-1">
                  {val === null ? <span className="text-muted-foreground italic">NULL</span> : String(val)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Database size={20} className="text-primary" />
        <span className="font-medium">SQLite</span>
        <div className="ml-auto flex items-center gap-2">
          {isLoading && (
            <span className="text-xs text-muted-foreground">{translate(locale, 'editor.loading')}</span>
          )}
          <Button
            size="sm"
            onClick={handleExecute}
            disabled={!isReady || isExecuting}
          >
            <Play size={14} className="mr-1" />
            {isExecuting ? translate(locale, 'editor.running') : translate(locale, 'editor.execute')}
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={handleClear}>
            <Trash size={14} />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex flex-col border-r border-border">
          <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-border bg-muted/50">
            Query
          </div>
          <div className="flex-1 overflow-auto">
            <CodeMirror
              value={code}
              height="100%"
              theme={isDark ? githubDark : githubLight}
              extensions={[sql()]}
              onChange={setCode}
              className="text-sm"
            />
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-border bg-muted/50">
            Results
          </div>
          <div ref={outputRef} className="flex-1 overflow-auto p-3 space-y-4">
            {error && (
              <div className="text-sm text-destructive">Error: {error}</div>
            )}
            {execError && (
              <div className="text-sm text-destructive">{execError}</div>
            )}
            {results.length === 0 && !error && !execError && (
              <div className="text-sm text-muted-foreground">
                {translate(locale, 'editor.sqlite.ready')}
              </div>
            )}
            {results.map((result, idx) => (
              <div key={idx} className="space-y-2">
                {renderTable(result.columns, result.values)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
