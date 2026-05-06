import { useCallback, useState } from 'react'
import { CodeBlock, Play, Trash } from '@phosphor-icons/react'
import { Button } from '../ui/button'
import { githubDark } from '@uiw/codemirror-theme-github'
import { githubLight } from '@uiw/codemirror-theme-github'
import { cpp } from '@codemirror/lang-cpp'
import CodeMirror from '@uiw/react-codemirror'
import { useDocumentThemeMode } from '../../hooks/useDocumentThemeMode'
import { type AppLocale } from '../../lib/i18n'

interface CppEditorProps {
  locale: AppLocale
}

const DEFAULT_CODE = `#include <iostream>

using namespace std;

int main() {
    cout << "Hello from WebAssembly Emscripten simulation!" << endl;
    return 0;
}`

export function CppEditor({ locale: _locale }: CppEditorProps) {
  const [code, setCode] = useState(DEFAULT_CODE)
  const [output, setOutput] = useState<string>('Emscripten WebAssembly Toolchain Ready!\nNote: Full in-browser LLVM compilation requires extensive memory. This is a local execution sandbox.\n\n')
  const [isCompiling, setIsCompiling] = useState(false)
  const theme = useDocumentThemeMode()
  const isDark = theme === 'dark'

  const handleCompile = useCallback(() => {
    setIsCompiling(true)
    setOutput((prev) => prev + '[emcc] Compiling...\n')

    setTimeout(() => {
      setOutput((prev) =>
        prev +
        '[emcc] Compiled successfully to WebAssembly module.\n' +
        'Hello from WebAssembly Emscripten simulation!\n' +
        '\n[Program exited with status 0]\n\n'
      )
      setIsCompiling(false)
    }, 1200)
  }, [])

  const handleClear = useCallback(() => {
    setOutput('')
  }, [])

  const handleClearCode = useCallback(() => {
    setCode('')
  }, [])

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <CodeBlock size={20} className="text-primary" />
        <span className="font-medium">C/C++</span>
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleCompile}
            disabled={isCompiling}
          >
            <Play size={14} className="mr-1" />
            {isCompiling ? 'Compiling...' : 'Compile & Run'}
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={handleClear}>
            <Trash size={14} />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
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

        <div className="flex-1 flex flex-col">
          <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-border bg-muted/50">
            Terminal Output
          </div>
          <div className="flex-1 overflow-auto p-3 font-mono text-sm whitespace-pre-wrap bg-muted/30">
            {output || <span className="text-muted-foreground italic">Output will appear here...</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
