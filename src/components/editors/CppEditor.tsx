import { useCallback, useEffect } from 'react'
import { Code, Trash, FloppyDisk } from '@phosphor-icons/react'
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

const DEFAULT_CODE = `// C/C++ Code Editor
// Note: In-browser compilation is not available.
// Use this editor to write and save C/C++ code.

#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}`

export function CppEditor({ locale, vaultSaveDeps }: CppEditorProps) {
  const [code, setCode] = usePersistentCode('cpp', DEFAULT_CODE)
  const { saveCodeNote } = useEditorVaultSave(vaultSaveDeps)
  const theme = useDocumentThemeMode()
  const isDark = theme === 'dark'

  useEffect(() => {
    window.getCppCode = () => code
    window.setCppCode = (newCode: string) => setCode(newCode)
  }, [code])

  const handleClear = useCallback(() => {
    setCode('')
  }, [setCode])

  const handleSaveCode = useCallback(async () => {
    await saveCodeNote(code, 'cpp')
  }, [code, saveCodeNote])

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Code size={20} className="text-primary" />
        <span className="font-medium">C/C++</span>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleSaveCode} disabled={!code}>
            <FloppyDisk size={14} className="mr-1" />
            {translate(locale, 'editor.save')}
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={handleClear}>
            <Trash size={14} />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex flex-col">
          <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-border bg-muted/50">
            {translate(locale, 'editor.code')}
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
      </div>

      <div className="px-3 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground">
        {translate(locale, 'editor.cpp.notice')}
      </div>
    </div>
  )
}
