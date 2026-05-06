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

interface OutputItem {
  text: string
  isError: boolean
  isImage?: boolean
  isHtml?: boolean
}

const DEFAULT_CODE = `import random

print("Hello from Python!")
print(f"Random number: {random.randint(1, 100)}")
`

export function PythonEditor({ locale: _locale, onSaveCode, onSaveImages: onSaveImagesProp }: PythonEditorProps) {
  const { isLoading, isReady, error, runPythonWithAutoInstall, writeFile, readDir } = usePyodide()
  const [code, setCode] = useState(DEFAULT_CODE)
  const [output, setOutput] = useState<OutputItem[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState('')
  const [files, setFiles] = useState<string[]>([])
  const outputRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const theme = useDocumentThemeMode()
  const isDark = theme === 'dark'

  useEffect(() => {
    window.getPythonCode = () => code
    window.setPythonCode = (newCode: string) => setCode(newCode)
  }, [code])

  useEffect(() => {
    window.addPythonPlot = (base64Data: string) => {
      setOutput((prev) => [...prev, { text: base64Data, isError: false, isImage: true }])
    }
    window.addPythonHtmlPlot = (html: string) => {
      setOutput((prev) => [...prev, { text: html, isError: false, isHtml: true }])
    }
    return () => {
      window.addPythonPlot = undefined
      window.addPythonHtmlPlot = undefined
    }
  }, [])

  const refreshFiles = useCallback(() => {
    const dir = readDir('/home/pyodide')
    setFiles(dir.filter((f) => f !== '.' && f !== '..'))
  }, [readDir])

  const handleRun = useCallback(async () => {
    setIsRunning(true)
    setProgress('')
    const newOutput: OutputItem[] = []

    const result = await runPythonWithAutoInstall(code, (msg) => {
      setProgress(msg)
    })

    if (result.stdout) {
      newOutput.push({ text: result.stdout, isError: false })
    }
    if (result.stderr) {
      newOutput.push({ text: result.stderr, isError: true })
    }
    if (result.error) {
      newOutput.push({ text: result.error, isError: true })
    }
    if (!result.stdout && !result.stderr && !result.error) {
      newOutput.push({ text: '[Executed successfully with no output]', isError: false })
    }

    setOutput((prev) => [...prev, ...newOutput])
    refreshFiles()
    setIsRunning(false)
    setProgress('')

    setTimeout(() => {
      outputRef.current?.scrollTo(0, outputRef.current.scrollHeight)
    }, 50)
  }, [code, runPythonWithAutoInstall, refreshFiles])

  const handleClear = useCallback(() => {
    setOutput([])
    setProgress('')
  }, [])

  const handleSaveCode = useCallback(() => {
    const title = `Python Script - ${new Date().toLocaleString()}`
    const plots = output.filter((item) => item.isImage || item.isHtml).map((item) => item.text)
    onSaveCode?.(code, title, plots)
  }, [code, output, onSaveCode])

  const handleSaveImages = useCallback(() => {
    const plots = output.filter((item) => item.isImage || item.isHtml)
    if (plots.length === 0) return
    const plotData = plots.map((plot) => plot.text)
    const titles = plots.map((_, idx) => `Plot ${idx + 1} - ${new Date().toLocaleString()}`)
    onSaveImagesProp?.(plotData, titles)
  }, [output, onSaveImagesProp])

  const handleClearCode = useCallback(() => {
    setCode('')
  }, [])

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const uploadedFiles = e.target.files
      if (!uploadedFiles?.length) return

      for (const file of Array.from(uploadedFiles)) {
        const buffer = await file.arrayBuffer()
        const uint8 = new Uint8Array(buffer)
        writeFile(`/home/pyodide/${file.name}`, uint8)
        setOutput((prev) => [...prev, { text: `>>> Uploaded: ${file.name}`, isError: false }])
      }
      refreshFiles()
      e.target.value = ''
    },
    [writeFile, refreshFiles]
  )

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
              <span className="text-muted-foreground italic">
                {isLoading ? 'Initializing Python runtime...' : 'Run code to see output'}
              </span>
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
