import type { ReactNode } from 'react'
import type { EditorKind } from './types'
import { PythonEditor } from './PythonEditor'
import { SqliteEditor } from './SqliteEditor'
import { DesmosEditor } from './DesmosEditor'
import { CppEditor } from './CppEditor'
import { ResizeHandle } from '../ResizeHandle'
import { Button } from '../ui/button'
import { X } from '@phosphor-icons/react'
import type { AppLocale } from '../../lib/i18n'

interface EditorContainerProps {
  kind: EditorKind
  locale: AppLocale
  rightPane?: ReactNode
  rightPaneWidth?: number
  onRightPaneResize?: (delta: number) => void
  onCloseRightPane?: () => void
  onSavePythonCode?: (code: string, title: string, plots: string[]) => void
  onSavePythonImages?: (plots: string[], titles: string[]) => void
}

export function EditorContainer({
  kind,
  locale,
  rightPane,
  rightPaneWidth,
  onRightPaneResize,
  onCloseRightPane,
  onSavePythonCode,
  onSavePythonImages,
}: EditorContainerProps) {
  const renderEditor = () => {
    switch (kind) {
      case 'python':
        return <PythonEditor locale={locale} onSaveCode={onSavePythonCode} onSaveImages={onSavePythonImages} />
      case 'sqlite':
        return <SqliteEditor locale={locale} />
      case 'desmos':
        return <DesmosEditor locale={locale} />
      case 'cpp':
        return <CppEditor locale={locale} />
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0 overflow-hidden">{renderEditor()}</div>

        {rightPane && rightPaneWidth !== undefined && onRightPaneResize && (
          <>
            <ResizeHandle onResize={onRightPaneResize} />
            <div
              className="flex flex-col h-full min-h-0 flex-shrink-0 border-l border-border overflow-hidden"
              style={{ width: rightPaneWidth }}
            >
              {onCloseRightPane && (
                <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/50">
                  <span className="text-xs font-medium text-muted-foreground">Note</span>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={onCloseRightPane}
                    title="Close note"
                  >
                    <X size={14} />
                  </Button>
                </div>
              )}
              <div className="flex-1 min-h-0 overflow-hidden">{rightPane}</div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
