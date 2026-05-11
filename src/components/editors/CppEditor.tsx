import { useCallback, useEffect, useState } from 'react'
import { Code, Trash, FloppyDisk, Play, Hourglass, Terminal } from '@phosphor-icons/react'
import { Button } from '../ui/button'
import { usePersistentCode } from './hooks/useEditorPersistence'
import { useEditorVaultSave, type EditorVaultSaveDeps } from './hooks/useEditorVaultSave'
import { githubDark } from '@uiw/codemirror-theme-github'
import { githubLight } from '@uiw/codemirror-theme-github'
import { cpp } from '@codemirror/lang-cpp'
import CodeMirror from '@uiw/react-codemirror'
import { useDocumentThemeMode } from '../../hooks/useDocumentThemeMode'
import { translate, type AppLocale } from '../../lib/i18n'

interface CppEditorProps {
  locale: AppLocale
  vaultSaveDeps: EditorVaultSaveDeps | null
}

interface OutputLine {
  text: string
  type: 'info' | 'error' | 'success' | 'output' | 'system'
}

interface RunLogEntry {
  id: string
  timestamp: string
  status: 'success' | 'error'
  duration: number
  output: string[]
}

const DEFAULT_CODE = `// C/C++ WASM Sandbox
// Emscripten Toolchain Simulation
// Full LLVM compilation would require 30MB+ WASM

#include <iostream>
#include <string>

using namespace std;

int main() {
    cout << "Hello from WebAssembly Emscripten simulation!" << endl;
    cout << "This is a local execution sandbox." << endl;
    return 0;
}`

const INITIAL_OUTPUT: OutputLine[] = [
  { text: 'Emscripten WebAssembly Toolchain Ready!', type: 'system' },
  { text: 'Note: Full in-browser LLVM compilation requires extensive memory.', type: 'info' },
  { text: 'This is a local execution sandbox for rapid prototyping.', type: 'info' },
  { text: '', type: 'system' },
]

export function CppEditor({ locale, vaultSaveDeps }: CppEditorProps) {
  const [code, setCode] = usePersistentCode('cpp', DEFAULT_CODE)
  const [output, setOutput] = useState<OutputLine[]>(INITIAL_OUTPUT)
  const [isCompiling, setIsCompiling] = useState(false)
  const [runLog, setRunLog] = useState<RunLogEntry[]>([])
  const [showRunLog, setShowRunLog] = useState(false)
  const { saveCodeNote } = useEditorVaultSave(vaultSaveDeps)
  const theme = useDocumentThemeMode()
  const isDark = theme === 'dark'

  useEffect(() => {
    window.getCppCode = () => code
    window.setCppCode = (newCode: string) => setCode(newCode)
  }, [code])

  const addToOutput = useCallback((text: string, type: OutputLine['type'] = 'output') => {
    setOutput(prev => [...prev, { text, type }])
  }, [])

  const handleClearCode = useCallback(() => {
    setCode('')
  }, [setCode])

  const handleClearOutput = useCallback(() => {
    setOutput([])
  }, [])

  const handleClearRunLog = useCallback(() => {
    setRunLog([])
  }, [])

  const handleSaveCode = useCallback(async () => {
    await saveCodeNote(code, 'cpp')
  }, [code, saveCodeNote])

  const handleCompileAndRun = useCallback(async () => {
    const startTime = Date.now()
    setIsCompiling(true)
    addToOutput('[emcc] Starting Emscripten compilation...', 'system')

    // Simulate Emscripten compilation overhead (1200ms)
    setTimeout(() => {
      addToOutput('[emcc] Compiling main.cpp...', 'info')
    }, 400)

    setTimeout(() => {
      addToOutput('[emcc] Linking WebAssembly module...', 'info')
    }, 800)

    setTimeout(() => {
      const endTime = Date.now()
      const duration = endTime - startTime
      const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false })
      
      const newOutput: OutputLine[] = [
        { text: '[emcc] Compiled successfully to WebAssembly module.', type: 'success' },
        { text: '', type: 'system' },
        { text: 'Hello from WebAssembly Emscripten simulation!', type: 'output' },
        { text: 'This is a local execution sandbox.', type: 'output' },
        { text: '', type: 'system' },
        { text: '[Program exited with status 0]', type: 'success' },
      ]
      
      newOutput.forEach(line => addToOutput(line.text, line.type))
      
      // Add to run log
      const runEntry: RunLogEntry = {
        id: `${Date.now()}`,
        timestamp,
        status: 'success',
        duration,
        output: newOutput.map(l => l.text).filter(t => t),
      }
      setRunLog(prev => [runEntry, ...prev].slice(0, 50)) // Keep last 50 runs
      
      setIsCompiling(false)
    }, 1200)
  }, [addToOutput])

  const getOutputColor = (type: OutputLine['type']) => {
    switch (type) {
      case 'error': return 'text-destructive'
      case 'success': return 'text-green-500'
      case 'info': return 'text-blue-400'
      case 'system': return 'text-muted-foreground'
      default: return 'text-foreground'
    }
  }

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Code size={20} className="text-primary" />
        <span className="font-medium">C/C++</span>
        <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">
          WASM Sandbox
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleCompileAndRun}
            disabled={isCompiling || !code}
            style={{ backgroundColor: '#e8602b', color: 'white' }}
            className="hover:opacity-90"
          >
            {isCompiling ? (
              <>
                <Hourglass size={14} className="mr-1 animate-pulse" />
                Compiling...
              </>
            ) : (
              <>
                <Play size={14} className="mr-1" />
                Compile & Run
              </>
            )}
          </Button>
          <Button size="sm" variant="outline" onClick={handleSaveCode} disabled={!code}>
            <FloppyDisk size={14} className="mr-1" />
            {translate(locale, 'editor.save')}
          </Button>
        </div>
      </div>

      {/* Workspace */}
      <div className="flex flex-1 min-h-0">
        {/* Code Area */}
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
              extensions={[cpp()]}
              onChange={setCode}
              className="text-sm"
            />
          </div>
        </div>

        {/* Terminal Output */}
        <div className="flex-1 flex flex-col bg-[#111]">
          <div className="flex items-center justify-between px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-border/30 bg-muted/10">
            <div className="flex items-center gap-1.5">
              <Terminal size={12} />
              <span>{showRunLog ? 'Run Log' : 'Terminal Output'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowRunLog(!showRunLog)}
                className="h-6 px-2 text-[10px] uppercase tracking-wider"
              >
                {showRunLog ? 'Output' : `Log (${runLog.length})`}
              </Button>
              <Button size="icon-xs" variant="ghost" onClick={showRunLog ? handleClearRunLog : handleClearOutput} className="text-muted-foreground hover:text-foreground">
                <Trash size={12} />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-3 font-mono text-sm space-y-0.5">
            {showRunLog ? (
              // Run Log View
              runLog.length === 0 ? (
                <div className="text-muted-foreground italic text-center py-8">No runs yet</div>
              ) : (
                runLog.map((entry) => (
                  <div key={entry.id} className="mb-3 pb-3 border-b border-border/20 last:border-0">
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider mb-1">
                      <span className={entry.status === 'success' ? 'text-green-500' : 'text-destructive'}>
                        {entry.status === 'success' ? '✓' : '✗'}
                      </span>
                      <span className="text-muted-foreground">{entry.timestamp}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">{entry.duration}ms</span>
                    </div>
                    <div className="text-foreground/80 line-clamp-2">
                      {entry.output.slice(0, 2).join(' ')}
                    </div>
                  </div>
                ))
              )
            ) : (
              // Terminal Output View
              <>
                {output.map((line, idx) => (
                  <div key={idx} className={getOutputColor(line.type)}>
                    {line.text}
                  </div>
                ))}
                {isCompiling && (
                  <div className="text-muted-foreground animate-pulse">_</div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground flex items-center justify-between">
        <span>{translate(locale, 'editor.cpp.notice')}</span>
        <span className="text-[10px] uppercase tracking-wider opacity-60">
          Emscripten Simulation
        </span>
      </div>
    </div>
  )
}

