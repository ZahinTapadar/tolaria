import { useEffect, useRef, useState, useCallback } from 'react'

interface PyodideInstance {
  runPythonAsync: (code: string) => Promise<void>
  runPython: (code: string) => string
  loadPackage: (packageName: string) => Promise<void>
  loadPackagesFromImports: (code: string) => Promise<void>
  FS: {
    writeFile: (path: string, data: Uint8Array) => void
    readFile: (path: string) => Uint8Array
    readdir: (path: string) => string[]
  }
}

interface PyodideWindow extends Window {
  loadPyodide?: (config: { indexURL: string }) => Promise<PyodideInstance>
  pyodideInstance?: PyodideInstance
}

declare const window: PyodideWindow

export interface UsePyodideResult {
  isLoading: boolean
  isReady: boolean
  error: string | null
  runCode: (code: string) => Promise<{ stdout: string; stderr: string; error?: string }>
  runPythonWithAutoInstall: (code: string, onProgress?: (msg: string) => void) => Promise<{ stdout: string; stderr: string; error?: string }>
  writeFile: (path: string, data: Uint8Array) => void
  readFile: (path: string) => Uint8Array | null
  readDir: (path: string) => string[]
  loadPackage: (pkg: string) => Promise<void>
  installPackage: (pkg: string) => Promise<void>
}

export function usePyodide(): UsePyodideResult {
  const [isLoading, setIsLoading] = useState(true)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pyodideRef = useRef<PyodideInstance | null>(null)

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        if (window.pyodideInstance) {
          pyodideRef.current = window.pyodideInstance
          if (!cancelled) {
            setIsReady(true)
            setIsLoading(false)
          }
          return
        }

        if (!window.loadPyodide) {
          await loadPyodideScript()
        }
        if (cancelled) return

        const pyodide = await window.loadPyodide!({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.20.0/full/',
        })
        if (cancelled) return

        await pyodide.runPythonAsync(`
import sys
import io
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
        `)

        window.pyodideInstance = pyodide
        pyodideRef.current = pyodide

        if (!cancelled) {
          setIsReady(true)
          setIsLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load Pyodide')
          setIsLoading(false)
        }
      }
    }

    init()

    return () => {
      cancelled = true
    }
  }, [])

  const runCode = useCallback(async (code: string) => {
    const pyodide = pyodideRef.current
    if (!pyodide) {
      return { stdout: '', stderr: '', error: 'Python runtime not ready' }
    }

    try {
      pyodide.runPython(`
sys.stdout.seek(0)
sys.stdout.truncate(0)
sys.stderr.seek(0)
sys.stderr.truncate(0)
      `)

      try {
        await pyodide.loadPackagesFromImports(code)
      } catch {
        // Ignore package load errors
      }

      await pyodide.runPythonAsync(code)

      const stdout = pyodide.runPython('sys.stdout.getvalue()')
      const stderr = pyodide.runPython('sys.stderr.getvalue()')

      return { stdout, stderr }
    } catch (err) {
      return {
        stdout: '',
        stderr: '',
        error: err instanceof Error ? err.message : 'Execution error',
      }
    }
  }, [])

  const writeFile = useCallback((path: string, data: Uint8Array) => {
    pyodideRef.current?.FS.writeFile(path, data)
  }, [])

  const readFile = useCallback((path: string): Uint8Array | null => {
    try {
      return pyodideRef.current?.FS.readFile(path) ?? null
    } catch {
      return null
    }
  }, [])

  const readDir = useCallback((path: string): string[] => {
    try {
      return pyodideRef.current?.FS.readdir(path) ?? []
    } catch {
      return []
    }
  }, [])

  const loadPackage = useCallback(async (pkg: string) => {
    await pyodideRef.current?.loadPackage(pkg)
  }, [])

  const installPackage = useCallback(async (pkg: string) => {
    await pyodideRef.current?.loadPackage('micropip')
    await pyodideRef.current?.runPythonAsync(`
import micropip
await micropip.install('${pkg}')
    `)
  }, [])

  const installPackagesFromCode = useCallback(async (code: string, onProgress?: (msg: string) => void) => {
    const pyodide = pyodideRef.current
    if (!pyodide) return

    // Load micropip first
    await pyodide.loadPackage('micropip')

    // Extract import statements
    const importRegex = /(?:^|\n)\s*(?:import|from)\s+([a-zA-Z0-9_]+)/g
    const matches = [...code.matchAll(importRegex)]
    const packages = [...new Set(matches.map(m => m[1]))]

    // Map common package names to PyPI names
    const packageMap: Record<string, string> = {
      'matplotlib': 'matplotlib',
      'plt': 'matplotlib',
      'seaborn': 'seaborn',
      'sns': 'seaborn',
      'plotly': 'plotly',
      'pd': 'pandas',
      'pandas': 'pandas',
      'np': 'numpy',
      'numpy': 'numpy',
      'scipy': 'scipy',
      'sklearn': 'scikit-learn',
      'PIL': 'Pillow',
      'Image': 'Pillow',
      'requests': 'requests',
      'bs4': 'beautifulsoup4',
      'BeautifulSoup': 'beautifulsoup4',
    }

    for (const pkg of packages) {
      const pypiName = packageMap[pkg] || pkg
      try {
        onProgress?.(`Installing ${pypiName}...`)
        await pyodide.runPythonAsync(`
import micropip
await micropip.install('${pypiName}')
        `)
      } catch {
        // Some packages might not be available, continue anyway
        onProgress?.(`Could not install ${pypiName}, continuing...`)
      }
    }
  }, [])

  const runPythonWithAutoInstall = useCallback(async (
    code: string,
    onProgress?: (msg: string) => void
  ): Promise<{ stdout: string; stderr: string; error?: string }> => {
    const pyodide = pyodideRef.current
    if (!pyodide) {
      return { stdout: '', stderr: '', error: 'Python runtime not ready' }
    }

    try {
      // Clear stdout/stderr
      pyodide.runPython(`
sys.stdout.seek(0)
sys.stdout.truncate(0)
sys.stderr.seek(0)
sys.stderr.truncate(0)
      `)

      // Install packages from imports
      onProgress?.('Checking dependencies...')
      await installPackagesFromCode(code, onProgress)

      // Setup matplotlib backend if needed
      if (code.includes('matplotlib') || code.includes('plt')) {
        onProgress?.('Setting up matplotlib...')
        await pyodide.runPythonAsync(`
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import io
import base64
import js

def _show_plot(*args, **kwargs):
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', dpi=100)
    buf.seek(0)
    img_str = base64.b64encode(buf.read()).decode('utf-8')
    js.addPythonPlot(img_str)
    plt.clf()

plt.show = _show_plot
        `)
      }

      // Setup plotly backend if needed
      if (code.includes('plotly')) {
        onProgress?.('Setting up plotly...')
        await pyodide.runPythonAsync(`
try:
    import plotly.io as pio
    import js
    
    def _show_plotly(fig, *args, **kwargs):
        # Enable modebar with download button and other useful tools
        config = {
            'displayModeBar': True,
            'displaylogo': False,
            'modeBarButtonsToRemove': [],
            'toImageButtonOptions': {
                'format': 'png',
                'filename': 'plot',
                'height': 800,
                'width': 1200,
                'scale': 2
            }
        }
        html = fig.to_html(full_html=False, include_plotlyjs='cdn', config=config)
        js.addPythonHtmlPlot(html)
    
    pio.show = _show_plotly
    pio.renderers.default = 'notebook'
except Exception:
    pass
        `)
      }

      // Run the code
      onProgress?.('Executing...')
      await pyodide.runPythonAsync(code)

      const stdout = pyodide.runPython('sys.stdout.getvalue()')
      const stderr = pyodide.runPython('sys.stderr.getvalue()')

      return { stdout, stderr }
    } catch (err) {
      return {
        stdout: '',
        stderr: '',
        error: err instanceof Error ? err.message : 'Execution error',
      }
    }
  }, [installPackagesFromCode])

  return {
    isLoading,
    isReady,
    error,
    runCode,
    runPythonWithAutoInstall,
    writeFile,
    readFile,
    readDir,
    loadPackage,
    installPackage,
  }
}

function loadPyodideScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.loadPyodide) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/pyodide/v0.20.0/full/pyodide.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Pyodide'))
    document.head.appendChild(script)
  })
}
