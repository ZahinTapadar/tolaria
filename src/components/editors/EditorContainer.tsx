import { PythonEditor } from './PythonEditor'
import { DesmosEditor } from './DesmosEditor'
import { SqliteEditor } from './SqliteEditor'
import { CppEditor } from './CppEditor'
import { type EditorKind } from './types'
import { type AppLocale } from '../../lib/i18n'
import { type EditorVaultSaveDeps } from './hooks/useEditorVaultSave'
import { EditorErrorBoundary } from './EditorErrorBoundary'

interface EditorContainerProps {
  kind: EditorKind
  locale: AppLocale
  vaultSaveDeps?: EditorVaultSaveDeps | null
}

export function EditorContainer({ kind, locale, vaultSaveDeps }: EditorContainerProps) {
  console.log('[EditorContainer] Rendering editor:', kind, 'vaultSaveDeps:', vaultSaveDeps ? 'present' : 'null')

  if (kind === 'python') {
    return (
      <EditorErrorBoundary editorName="Python">
        <PythonEditor locale={locale} vaultSaveDeps={vaultSaveDeps ?? null} />
      </EditorErrorBoundary>
    )
  }

  if (kind === 'sqlite') {
    return (
      <EditorErrorBoundary editorName="SQLite">
        <SqliteEditor locale={locale} vaultSaveDeps={vaultSaveDeps ?? null} />
      </EditorErrorBoundary>
    )
  }

  if (kind === 'desmos') {
    return (
      <EditorErrorBoundary editorName="Desmos">
        <DesmosEditor locale={locale} />
      </EditorErrorBoundary>
    )
  }

  if (kind === 'cpp') {
    return (
      <EditorErrorBoundary editorName="C++">
        <CppEditor locale={locale} vaultSaveDeps={vaultSaveDeps ?? null} />
      </EditorErrorBoundary>
    )
  }

  return null
}
