import { haptic } from '../features/haptics.js';

let isInitialized = false;
let pyodideInstance = null;
let codeEditor = null;

export async function buildPythonView() {
  const pythonView = document.getElementById('python-view');
  if (!pythonView) return;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  if (isInitialized) {
    if (codeEditor) {
      codeEditor.setOption("theme", isDark ? "dracula" : "neo");
    }
    return;
  }
  isInitialized = true;

  pythonView.innerHTML = `
    <div class="python-editor-container">
      <div class="python-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="material-symbols-outlined" style="font-size:1.4rem;">terminal</span>
          <span class="python-title">Python Interactive Console</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <input type="file" id="python-file-upload" style="display:none;" multiple>
          <button id="upload-dataset-btn" class="run-btn" style="background:transparent;color:var(--text);border:1px solid var(--outline-variant);" title="Upload File to Virtual File System">
             <span class="material-symbols-outlined" style="font-size:1.1rem;">upload_file</span> Data
          </button>
          <button id="run-python-btn" class="run-btn" disabled>
             <span class="material-symbols-outlined" style="font-size:1rem;">hourglass_top</span> Loading Runtime...
          </button>
        </div>
      </div>
      <div class="python-workspace">
        <div class="python-files-area" id="python-files-sidebar">
          <div class="output-header">
            <span>Virtual FS</span>
            <button id="refresh-files-btn" class="clear-btn" title="Refresh Files">
               <span class="material-symbols-outlined" style="font-size:1.1rem;">refresh</span>
            </button>
          </div>
          <div id="python-files-list" style="flex:1;overflow-y:auto;">
             <div style="padding:12px;color:var(--muted);font-size:0.8rem;text-align:center;">Loading...</div>
          </div>
        </div>
        <div class="python-code-area">
          <div class="output-header">
            <span>Code</span>
            <button id="clear-python-code-btn" class="clear-btn" title="Clear Code">
               <span class="material-symbols-outlined" style="font-size:1.1rem;">delete</span>
            </button>
          </div>
          <textarea id="python-code-input"></textarea>
        </div>
        <div class="python-output-area">
          <div class="output-header">
            <span>Console Output</span>
            <button id="clear-python-btn" class="clear-btn" title="Clear History">
               <span class="material-symbols-outlined" style="font-size:1.1rem;">delete</span>
            </button>
          </div>
          <div id="python-output-display"></div>
        </div>
      </div>
    </div>
  `;

  codeEditor = window.CodeMirror.fromTextArea(document.getElementById('python-code-input'), {
    mode: {
      name: "python",
      version: 3,
      singleLineStringErrors: false,
    },
    theme: isDark ? "dracula" : "neo",
    lineNumbers: true,
    indentUnit: 4,
    matchBrackets: true,
  });
  window.getPythonCode = () => codeEditor ? codeEditor.getValue() : '';
  window.setPythonCode = (code) => { if (codeEditor) { codeEditor.setValue(code); setTimeout(()=>codeEditor.refresh(),50); } };

  const defaultCode = `import random
# The SQLite tab database is automatically mapped to 'bear.db'
# import sqlite3
# import pandas as pd
# conn = sqlite3.connect('bear.db')
# df = pd.read_sql_query('SELECT * FROM employees', conn)

def greet(name):
    num = random.randint(1, 100)
    return f"Hello {name}, greetings from WebAssembly! Your lucky number is {num}"

print(greet("Developer"))`;
  codeEditor.setValue(defaultCode);
  
  // Need to force refresh once after appending it so it displays correctly
  setTimeout(() => codeEditor.refresh(), 100);

  const outputDisplay = document.getElementById('python-output-display');
  const runBtn = document.getElementById('run-python-btn');
  const clearBtn = document.getElementById('clear-python-btn');

  function addToOutput(text, isError=false) {
    const div = document.createElement('div');
    if (isError) {
      div.style.color = 'red';
      div.style.fontWeight = 'bold';
    }
    div.innerText = text;
    outputDisplay.appendChild(div);
    outputDisplay.scrollTop = outputDisplay.scrollHeight;
  }

  function refreshFilesList() {
    const listEl = document.getElementById('python-files-list');
    if (!listEl || !pyodideInstance) return;
    try {
      const files = pyodideInstance.FS.readdir('/home/pyodide');
      const displayFiles = files.filter(f => f !== '.' && f !== '..');
      if (displayFiles.length === 0) {
        listEl.innerHTML = '<div style="padding:12px;color:var(--muted);font-size:0.8rem;text-align:center;">No files loaded.</div>';
        return;
      }
      const esc = (str) => str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      listEl.innerHTML = displayFiles.map(f => `
        <div class="file-list-item">
          <span class="material-symbols-outlined" style="font-size:1rem;color:var(--primary);">draft</span>
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(f)}</span>
        </div>
      `).join('');
    } catch(e) {
      listEl.innerHTML = '<div style="padding:12px;color:var(--muted);font-size:0.8rem;">Error reading FS</div>';
    }
  }

  document.getElementById('refresh-files-btn').addEventListener('click', () => {
    haptic('light');
    refreshFilesList();
  });

  function addImageToOutput(base64Data) {
    const img = document.createElement('img');
    img.src = "data:image/png;base64," + base64Data;
    img.style.maxWidth = '100%';
    img.style.marginTop = '10px';
    img.style.borderRadius = '8px';
    img.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
    outputDisplay.appendChild(img);
    outputDisplay.scrollTop = outputDisplay.scrollHeight;
  }

  function addHtmlPlotToOutput(htmlStr) {
    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = '450px';
    iframe.style.border = 'none';
    iframe.style.marginTop = '10px';
    iframe.style.borderRadius = '8px';
    iframe.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
    iframe.style.background = '#fff'; // Plotly needs white background typically
    iframe.srcdoc = htmlStr;
    outputDisplay.appendChild(iframe);
    outputDisplay.scrollTop = outputDisplay.scrollHeight;
  }

  // Expose JS functions to Python
  window.addPythonPlot = addImageToOutput;
  window.addPythonHtmlPlot = addHtmlPlotToOutput;

  function clearHistory() {
    outputDisplay.innerHTML = "";
    haptic('success');
  }

  outputDisplay.innerHTML = "<span>Initializing Python Runtime (this may take a few seconds)...\n</span>";

  try {
    pyodideInstance = await window.loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.20.0/full/"
    });
    
    // Redirect sys.stdout directly internally
    await pyodideInstance.runPythonAsync(`
import sys
import io
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
    `);

    outputDisplay.innerHTML += "<span>Python Ready!\n\n</span>";
    runBtn.disabled = false;
    runBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:1.1rem;">play_arrow</span> Run`;
    runBtn.classList.add('ready');
    refreshFilesList();
  } catch (err) {
    addToOutput("Failed to load Pyodide: " + err, true);
  }

  clearBtn.addEventListener('click', clearHistory);
  
  const clearCodeBtn = document.getElementById('clear-python-code-btn');
  if (clearCodeBtn) {
    clearCodeBtn.addEventListener('click', () => {
      codeEditor.setValue('');
      haptic('selection');
    });
  }

  // --- FILE UPLOAD TO VIRTUAL FS ---
  const uploadBtn = document.getElementById('upload-dataset-btn');
  const fileInput = document.getElementById('python-file-upload');
  
  if (uploadBtn && fileInput) {
    uploadBtn.addEventListener('click', () => {
      haptic('light');
      if (!pyodideInstance) {
        alert("Please wait for Python to load first.");
        return;
      }
      fileInput.click();
    });
    
    fileInput.addEventListener('change', async (e) => {
      const files = e.target.files;
      if (!files.length) return;
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const arrayBuffer = await file.arrayBuffer();
        const uint8View = new Uint8Array(arrayBuffer);
        
        try {
          // Pyodide's default working directory is /home/pyodide/
          pyodideInstance.FS.writeFile(file.name, uint8View);
          addToOutput(`>>> [System] Uploaded dataset '${file.name}' successfully. You can now load it directly (e.g., pd.read_csv('${file.name}')).`);
          refreshFilesList();
        } catch (err) {
          addToOutput(`>>> [System Error] Failed to upload '${file.name}': ` + err.message, true);
        }
      }
      
      fileInput.value = ''; // reset so the same file can be uploaded again if needed
    });
  }

  runBtn.addEventListener('click', async () => {
    haptic('selection');
    if (!pyodideInstance) return;
    
    const code = codeEditor.getValue();
    runBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:1.1rem;">hourglass_top</span> Running...`;
    runBtn.disabled = true;

    try {
      // Clear previous stdout/stderr internally
      pyodideInstance.runPython(`sys.stdout.seek(0)\nsys.stdout.truncate(0)\nsys.stderr.seek(0)\nsys.stderr.truncate(0)`);
      
      addToOutput(">>> Resolving dependencies (Pyodide & PyPI) and evaluating...");
      
      // 1. Pyodide Standard Packages
      try {
        await pyodideInstance.loadPackagesFromImports(code);
      } catch (pkgErr) {
        addToOutput("[Package Warning] Could not resolve some built-in packages: " + pkgErr.message, true);
      }
      
      // 2. Dynamic PyPI Auto-Installer via Micropip
      try {
        await pyodideInstance.loadPackage('micropip');
        const importRegex = /(?:^|\n)\s*(?:import|from)\s+([a-zA-Z0-9_]+)/g;
        const matches = [...code.matchAll(importRegex)];
        const packages = [...new Set(matches.map(m => m[1]))];
        
        if (packages.length > 0) {
          const pkgListStr = JSON.stringify(packages);
          await pyodideInstance.runPythonAsync(`
import importlib.util
import micropip
import json

packages = json.loads('${pkgListStr}')
for pkg in packages:
    if importlib.util.find_spec(pkg) is None:
        try:
            await micropip.install(pkg)
        except Exception:
            pass
          `);
        }
      } catch (e) {
        console.warn("PyPI auto-installer warning:", e);
      }

      // Inject Matplotlib rendering support if used
      if (code.includes('matplotlib') || code.includes('seaborn')) {
        await pyodideInstance.runPythonAsync(`
try:
    import matplotlib.pyplot as plt
    import io, base64, js
    
    def _bear_custom_show(*args, **kwargs):
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight')
        buf.seek(0)
        img_str = base64.b64encode(buf.read()).decode('utf-8')
        js.addPythonPlot(img_str)
        plt.clf()
        
    plt.show = _bear_custom_show
except Exception as e:
    pass
        `);
      }

      // Inject Plotly rendering support if used
      if (code.includes('plotly')) {
        await pyodideInstance.runPythonAsync(`
try:
    import plotly.io as pio
    import js
    
    def _bear_plotly_show(*args, **kwargs):
        fig = args[0]
        html_str = fig.to_html(full_html=False, include_plotlyjs='cdn')
        js.addPythonHtmlPlot(html_str)
        
    pio.show = _bear_plotly_show
except Exception as e:
    pass
        `);
      }

      // --- SYNCHRONIZE SQLITE TO PYTHON ---
      if (window.getSharedSqliteDb) {
        const dbData = window.getSharedSqliteDb();
        if (dbData) {
          try {
             pyodideInstance.FS.writeFile('/home/pyodide/bear.db', dbData);
          } catch(e) { console.warn("Failed to mount sqlite DB:", e); }
        }
      }

      // Execute the code with auto-retry for nested ModuleNotFoundErrors
      let executionSuccess = false;
      let retriesLeft = 3;
      
      while (retriesLeft > 0 && !executionSuccess) {
        try {
          await pyodideInstance.runPythonAsync(code);
          executionSuccess = true;
        } catch (err) {
          const match = err.message.match(/ModuleNotFoundError: No module named '([^']+)'/);
          if (match && match[1]) {
            const missingPkg = match[1];
            addToOutput(`>>> [System] Missing sub-dependency detected: '${missingPkg}'. Installing...`);
            try {
              await pyodideInstance.runPythonAsync(`import micropip\nawait micropip.install('${missingPkg}')`);
              retriesLeft--;
              addToOutput(`>>> [System] Retrying execution...`);
            } catch (installErr) {
              // If micropip can't find it, we must throw the original error
              addToOutput(err.message, true);
              break;
            }
          } else {
            addToOutput(err.message, true);
            break;
          }
        }
      }
      
      // --- SYNCHRONIZE PYTHON BACK TO SQLITE ---
      if (window.setSharedSqliteDb) {
        try {
           const newData = pyodideInstance.FS.readFile('/home/pyodide/bear.db');
           window.setSharedSqliteDb(newData);
        } catch(e) { /* bear.db might not exist or wasn't changed */ }
      }
      
      refreshFilesList();
      
      // Get stdout
      const stdout = pyodideInstance.runPython(`sys.stdout.getvalue()`);
      const stderr = pyodideInstance.runPython(`sys.stderr.getvalue()`);
      
      if (stdout) {
         addToOutput(stdout);
      }
      if (stderr) {
         addToOutput(stderr, true);
      }
      if (!stdout && !stderr) {
         addToOutput("[Executed Successfully with no output]");
      }
    } catch (err) {
      addToOutput(err, true);
    } finally {
      runBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:1.1rem;">play_arrow</span> Run`;
      runBtn.disabled = false;
    }
  });
}
