import { useRef } from 'react'
import { Graph, MagicWand, ArrowCounterClockwise } from '@phosphor-icons/react'
import { Button } from '../ui/button'
import { useDesmos } from './hooks/useDesmos'
import { useDocumentThemeMode } from '../../hooks/useDocumentThemeMode'
import { type AppLocale } from '../../lib/i18n'

interface DesmosEditorProps {
  locale: AppLocale
}

export function DesmosEditor({ locale: _locale }: DesmosEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const theme = useDocumentThemeMode()
  const isDark = theme === 'dark'
  const { isLoading, isReady, error, loadExample, setBlank } = useDesmos(containerRef, isDark)

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Graph size={20} className="text-primary" />
        <span className="font-medium">Desmos</span>
        <div className="ml-auto flex items-center gap-2">
          {isLoading && <span className="text-xs text-muted-foreground">Loading...</span>}
          <Button size="sm" variant="outline" onClick={loadExample} disabled={!isReady}>
            <MagicWand size={14} className="mr-1" />
            Example
          </Button>
          <Button size="sm" variant="outline" onClick={setBlank} disabled={!isReady}>
            <ArrowCounterClockwise size={14} className="mr-1" />
            Reset
          </Button>
        </div>
      </div>

      <div className="flex-1 relative">
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-destructive">
            Error: {error}
          </div>
        )}
        <div ref={containerRef} className="absolute inset-0" />
      </div>
    </div>
  )
}
