export interface QueryResult {
  columns: string[]
  values: (string | number | null)[][]
}

declare global {
  interface Window {
    // SQLite sync
    getSharedSqliteDb?: () => Uint8Array | null
    setSharedSqliteDb?: (data: Uint8Array) => void
    getSqliteCode?: () => string
    setSqliteCode?: (code: string) => void

    // Python code access
    getPythonCode?: () => string
    setPythonCode?: (code: string) => void

    // Python plot output
    addPythonPlot?: (base64Data: string) => void
    addPythonHtmlPlot?: (html: string) => void
    onPlotlyDownload?: (base64Data: string, filename: string) => void

    // Pyodide
    pyodideInstance?: unknown
    loadPyodide?: (config: { indexURL: string }) => Promise<unknown>

    // SQL.js
    initSqlJs?: (config: { locateFile: (file: string) => string }) => Promise<unknown>

    // Desmos
    Desmos?: {
      GraphingCalculator: (element: HTMLElement, options: unknown) => {
        setExpression: (expr: { id: string; latex: string; color?: string }) => void
        setBlank: () => void
        setMathBounds: (bounds: { left: number; right: number; bottom: number; top: number }) => void
        updateSettings: (settings: { colors?: unknown }) => void
      }
    }
  }
}

export type EditorKind = 'python' | 'sqlite' | 'desmos'
