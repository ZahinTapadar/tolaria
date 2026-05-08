import { useCallback, useEffect, useRef, useState } from 'react'

/** Module-level singleton — survives component remounts. */
let pyodideSingleton: unknown = null
let pyodideInitPromise: Promise<unknown> | null = null

async function getOrInitPyodide(): Promise<unknown> {
  if (pyodideSingleton) return pyodideSingleton
  if (pyodideInitPromise) return pyodideInitPromise

  pyodideInitPromise = (async () => {
    await loadPyodideScript()
    const pyodide = await window.loadPyodide!({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.20.0/full/',
    })
    await (pyodide as { runPythonAsync: (code: string) => Promise<void> }).runPythonAsync(`
import sys
import io
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
    `)
    window.pyodideInstance = pyodide
    pyodideSingleton = pyodide
    return pyodide
  })()

  return pyodideInitPromise
}

export function usePyodide() {
  const [isLoading, setIsLoading] = useState(() => pyodideSingleton === null)
  const [isReady, setIsReady] = useState(() => pyodideSingleton !== null)
  const [error, setError] = useState<string | null>(null)
  const pyodideRef = useRef<unknown>(pyodideSingleton)

  useEffect(() => {
    if (pyodideSingleton) {
      pyodideRef.current = pyodideSingleton
      return
    }

    let cancelled = false

    getOrInitPyodide()
      .then((pyodide) => {
        if (cancelled) return
        pyodideRef.current = pyodide
        setIsReady(true)
        setIsLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        pyodideInitPromise = null
        setError(err instanceof Error ? err.message : 'Failed to load Pyodide')
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const installPackagesFromCode = useCallback(async (code: string, onProgress?: (msg: string) => void) => {
    const pyodide = pyodideRef.current as {
      loadPackage: (pkg: string) => Promise<void>
      runPythonAsync: (code: string) => Promise<void>
    } | null
    if (!pyodide) return

    await pyodide.loadPackage('micropip')

    const importRegex = /(?:^|\n)\s*(?:import|from)\s+([a-zA-Z0-9_]+)/g
    const matches = [...code.matchAll(importRegex)]
    const packages = [...new Set(matches.map((m) => m[1]))]

    const packageMap: Record<string, string> = {
      matplotlib: 'matplotlib',
      plt: 'matplotlib',
      seaborn: 'seaborn',
      sns: 'seaborn',
      plotly: 'plotly',
      pd: 'pandas',
      pandas: 'pandas',
      np: 'numpy',
      numpy: 'numpy',
      scipy: 'scipy',
      sklearn: 'scikit-learn',
      PIL: 'Pillow',
      Image: 'Pillow',
      requests: 'requests',
      bs4: 'beautifulsoup4',
      BeautifulSoup: 'beautifulsoup4',
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
        onProgress?.(`Could not install ${pypiName}, continuing...`)
      }
    }
  }, [])

  const runPythonWithAutoInstall = useCallback(
    async (
      code: string,
      onProgress?: (msg: string) => void
    ): Promise<{ stdout: string; stderr: string; error?: string }> => {
      const pyodide = pyodideRef.current as {
        runPython: (code: string) => string
        runPythonAsync: (code: string) => Promise<void>
      } | null
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

        onProgress?.('Checking dependencies...')
        await installPackagesFromCode(code, onProgress)

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

        if (code.includes('plotly')) {
          onProgress?.('Setting up plotly...')
          await pyodide.runPythonAsync(`
try:
    import plotly.io as pio
    import js

    def _show_plotly(fig, *args, **kwargs):
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
    },
    [installPackagesFromCode]
  )

  const writeFile = useCallback((path: string, data: Uint8Array) => {
    const pyodide = pyodideRef.current as { FS: { writeFile: (path: string, data: Uint8Array) => void } } | null
    pyodide?.FS.writeFile(path, data)
  }, [])

  const readFile = useCallback((path: string): Uint8Array | null => {
    const pyodide = pyodideRef.current as { FS: { readFile: (path: string) => Uint8Array } } | null
    try {
      return pyodide?.FS.readFile(path) ?? null
    } catch {
      return null
    }
  }, [])

  const readDir = useCallback((path: string): string[] => {
    const pyodide = pyodideRef.current as { FS: { readdir: (path: string) => string[] } } | null
    try {
      return pyodide?.FS.readdir(path) ?? []
    } catch {
      return []
    }
  }, [])

  return {
    isLoading,
    isReady,
    error,
    runPythonWithAutoInstall,
    writeFile,
    readFile,
    readDir,
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
