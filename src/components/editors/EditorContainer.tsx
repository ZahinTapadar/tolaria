import { PythonEditor } from './PythonEditor'
import { DesmosEditor } from './DesmosEditor'
import { SqliteEditor } from './SqliteEditor'
import { type EditorKind } from './types'
import { type AppLocale } from '../../lib/i18n'

interface EditorContainerProps {
  kind: EditorKind
  locale: AppLocale
  onSaveCode?: (code: string, title: string, plots: string[]) => void
  onSaveImages?: (plots: string[], titles: string[]) => void
}

export function EditorContainer({ kind, locale, onSaveCode, onSaveImages }: EditorContainerProps) {
  if (kind === 'python') {
    return (
      <PythonEditor
        locale={locale}
        onSaveCode={onSaveCode}
        onSaveImages={onSaveImages}
      />
    )
  }

  if (kind === 'sqlite') {
    return <SqliteEditor locale={locale} />
  }

  if (kind === 'desmos') {
    return <DesmosEditor locale={locale} />
  }

  return null
}
