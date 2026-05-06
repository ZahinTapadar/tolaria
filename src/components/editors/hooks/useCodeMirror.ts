import { useEffect, useRef, useState } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import type { Extension } from '@codemirror/state'

export interface UseCodeMirrorOptions {
  language: Extension
  theme: Extension
  defaultValue?: string
  onChange?: (value: string) => void
}

export interface CodeMirrorInstance {
  view: EditorView | null
  getValue: () => string
  setValue: (value: string) => void
}

export function useCodeMirror(options: UseCodeMirrorOptions): {
  ref: React.RefObject<HTMLDivElement | null>
  instance: CodeMirrorInstance
} {
  const ref = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const [_mounted, setMounted] = useState(false)

  useEffect(() => {
    if (!ref.current || viewRef.current) return

    const view = new EditorView({
      doc: options.defaultValue ?? '',
      extensions: [
        basicSetup,
        options.language,
        options.theme,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            options.onChange?.(update.state.doc.toString())
          }
        }),
      ],
      parent: ref.current,
    })

    viewRef.current = view
    setMounted(true)

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [])

  const instance: CodeMirrorInstance = {
    view: viewRef.current,
    getValue: () => viewRef.current?.state.doc.toString() ?? '',
    setValue: (value: string) => {
      const view = viewRef.current
      if (!view) return
      const current = view.state.doc.toString()
      if (current === value) return
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      })
    },
  }

  return { ref, instance }
}
