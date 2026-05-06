import { useCallback, useEffect, useRef, useState } from 'react'
import { Terminal, Play, Trash, Upload, FloppyDisk, Image } from '@phosphor-icons/react'
import { Button } from '../ui/button'
import { usePyodide } from './hooks/usePyodide'
import { githubDark } from '@uiw/codemirror-theme-github'
import { githubLight } from '@uiw/codemirror-theme-github'
import { python } from '@codemirror/lang-python'
import CodeMirror from '@uiw/react-codemirror'
import { useDocumentThemeMode } from '../../hooks/useDocumentThemeMode'
import { type AppLocale } from '../../lib/i18n'

interface PythonEditorProps {
  locale: AppLocale
  onSaveCode?: (code: string, title: string, plots: string[]) => void
  onSaveImages?: (plots: string[], titles: string[]) => void
}

const DEFAULT_CODE = `import random
# The SQLite tab database is automatically mapped to 'bear.db'
# import sqlite3
# import pandas as pd
# conn = sqlite3.connect('bear.db')
# df = pd.read_sql_query('SELECT * FROM employees', conn)

def greet(name):
    num = random.randint(1, 100)
    return f"Hello {name}, greetings from WebAssembly! Your lucky number is {num}"

print(greet("Developer"))`

export function PythonEditor({ locale: _locale, onSaveCode, onSaveImages: onSaveImagesProp }: PythonEditorProps) {
  const { isLoading: _isLoading, isReady, error, runPythonWithAutoInstall, writeFile, readFile, readDir } = usePyodide()
  const [code, setCode] = useState(DEFAULT_CODE)
  const [output, setOutput] = useState<{ text: string; isError: boolean; isImage?: boolean; isHtml?: boolean; id?: string }[]>([])
  const [progress, setProgress] = useState<string>('')
  const [isRunning, setIsRunning] = useState(false)
  const [files, setFiles] = useState<string[]>([])
  const outputRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const theme = useDocumentThemeMode()
  const isDark = theme === 'dark'

  useEffect(() => {
    window.getPythonCode = () => code
    window.setPythonCode = (newCode: string) => setCode(newCode)
    window.addPythonPlot = (base64: string) => {
      setOutput((prev) => [...prev, { text: base64, isError: false, isImage: true }])
    }
    window.addPythonHtmlPlot = (html: string) => {
      setOutput((prev) => [...prev, { text: html, isError: false, isHtml: true }])
    }
  }, [code])

  useEffect(() => {
    if (isReady) {
      refreshFiles()
    }
  }, [isReady])

  const refreshFiles = () => {
    const list = readDir('/home/pyodide').filter((f) => f !== '.' && f !== '..')
    setFiles(list)
  }

  const handleRun = useCallback(async () => {
    setIsRunning(true)
    setProgress('Initializing...')
    setOutput((prev) => [...prev, { text: '>>> Running...', isError: false, id: 'running' }])

    // Sync SQLite DB if available
    if (window.getSharedSqliteDb) {
      const dbData = window.getSharedSqliteDb()
      if (dbData) {
        writeFile('/home/pyodide/bear.db', dbData)
      }
    }

    const result = await runPythonWithAutoInstall(code, (msg) => {
      setProgress(msg)
      setOutput((prev) => [...prev.slice(0, -1), { text: `>>> ${msg}`, isError: false, id: 'running' }])
    })

    // Sync back to SQLite
    if (window.setSharedSqliteDb) {
      const newData = readFile('/home/pyodide/bear.db')
      if (newData) {
        window.setSharedSqliteDb(newData)
      }
    }

    setOutput((prev) => {
      const filtered = prev.filter((item) => item.id !== 'running')
      if (result.error) {
        return [...filtered, { text: result.error, isError: true }]
      }
      const newOutput = [...filtered]
      if (result.stdout) {
        newOutput.push({ text: result.stdout, isError: false })
      }
      if (result.stderr) {
        newOutput.push({ text: result.stderr, isError: true })
      }
      if (!result.stdout && !result.stderr && !result.error) {
        newOutput.push({ text: '[Executed Successfully with no output]', isError: false })
      }
      return newOutput
    })

    refreshFiles()
    setIsRunning(false)
    setProgress('')

    setTimeout(() => {
      outputRef.current?.scrollTo(0, outputRef.current.scrollHeight)
    }, 50)
  }, [code, runPythonWithAutoInstall, writeFile, readFile, readDir])

  const handleClear = useCallback(() => {
    setOutput([])
    setProgress('')
  }, [])

  const handleSaveCode = useCallback(() => {
    const title = `Python Script - ${new Date().toLocaleString()}`
    const plots = output.filter((item) => item.isImage || item.isHtml).map(item => item.text)
    onSaveCode?.(code, title, plots)
  }, [code, output, onSaveCode])

  const handleSaveImages = useCallback(() => {
    // Capture both matplotlib images (isImage) and plotly HTML plots (isHtml)
    const plots = output.filter((item) => item.isImage || item.isHtml)
    if (plots.length === 0) return
    
    const plotData = plots.map(plot => plot.text)
    const titles = plots.map((_, idx) => `Plot ${idx + 1} - ${new Date().toLocaleString()}`)
    onSaveImagesProp?.(plotData, titles)
  }, [output, onSaveImagesProp])

  const handleClearCode = useCallback(() => {
    setCode('')
  }, [])

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return

    for (const file of Array.from(files)) {
      const buffer = await file.arrayBuffer()
      const uint8 = new Uint8Array(buffer)
      writeFile(`/home/pyodide/${file.name}`, uint8)
      setOutput((prev) => [...prev, { text: `>>> Uploaded: ${file.name}`, isError: false }])
    }
    refreshFiles()
    e.target.value = ''
  }, [writeFile])

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Terminal size={20} className="text-primary" />
        <span className="font-medium">Python</span>
        <div className="ml-auto flex items-center gap-2">
          {isRunning && progress && (
            <span className="text-xs text-muted-foreground mr-2">{progress}</span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={!isReady}
          >
            <Upload size={14} className="mr-1" />
            Data
          </Button>
          <Button size="sm" onClick={handleRun} disabled={!isReady || isRunning}>
            <Play size={14} className="mr-1" />
            {isRunning ? 'Running...' : 'Run'}
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={handleClear}>
            <Trash size={14} />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSaveCode}
            disabled={!code}
          >
            <FloppyDisk size={14} className="mr-1" />
            Save Code
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSaveImages}
            disabled={!output.some((item) => item.isImage || item.isHtml)}
          >
            <Image size={14} className="mr-1" />
            Save Images
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-48 flex flex-col border-r border-border">
          <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-border bg-muted/50">
            Files
          </div>
          <div className="flex-1 overflow-auto p-2 space-y-1">
            {files.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-4">No files</div>
            )}
            {files.map((f) => (
              <div key={f} className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-muted">
                <span className="truncate">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col border-r border-border">
          <div className="flex items-center justify-between px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-border bg-muted/50">
            <span>Code</span>
            <Button size="icon-xs" variant="ghost" onClick={handleClearCode}>
              <Trash size={12} />
            </Button>
          </div>
          <div className="flex-1 overflow-auto">
            <CodeMirror
              value={code}
              height="100%"
              theme={isDark ? githubDark : githubLight}
              extensions={[python()]}
              onChange={setCode}
              className="text-sm"
            />
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-border bg-muted/50">
            Output
          </div>
          <div ref={outputRef} className="flex-1 overflow-auto p-3 space-y-2 font-mono text-sm">
            {error && <div className="text-destructive">Error: {error}</div>}
            {output.length === 0 && !error && (
              <span className="text-muted-foreground italic">Initializing Python Runtime...</span>
            )}
            {output.map((item, idx) => {
              if (item.isImage) {
                return (
                  <img
                    key={idx}
                    src={`data:image/png;base64,${item.text}`}
                    className="max-w-full rounded-lg shadow"
                    alt="Plot"
                  />
                )
              }
              if (item.isHtml) {
                return (
                  <iframe
                    key={idx}
                    srcDoc={item.text}
                    className="w-full h-96 rounded-lg shadow bg-white"
                    title="Plot"
                  />
                )
              }
              return (
                <div key={idx} className={item.isError ? 'text-destructive' : ''}>
                  {item.text}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
