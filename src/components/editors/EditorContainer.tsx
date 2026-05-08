import { PythonEditor } from './PythonEditor'
import { DesmosEditor } from './DesmosEditor'
import { SqliteEditor } from './SqliteEditor'
import { type EditorKind } from './types'
import { type AppLocale } from '../../lib/i18n'
import { type EditorVaultSaveDeps } from './hooks/useEditorVaultSave'

interface EditorContainerProps {
  kind: EditorKind
  locale: AppLocale
  vaultSaveDeps?: EditorVaultSaveDeps | null
}

export function EditorContainer({ kind, locale, vaultSaveDeps }: EditorContainerProps) {
  if (kind === 'python') {
    return <PythonEditor locale={locale} vaultSaveDeps={vaultSaveDeps ?? null} />
  }

  if (kind === 'sqlite') {
    return <SqliteEditor locale={locale} vaultSaveDeps={vaultSaveDeps ?? null} />
  }

  if (kind === 'desmos') {
    return <DesmosEditor locale={locale} />
  }

  return null
}
