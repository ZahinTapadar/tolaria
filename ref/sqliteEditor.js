import { haptic } from '../features/haptics.js';
import { esc } from '../utils/dom.js';

let isInitialized = false;
let db = null;
let SQL_module = null;
let codeEditor = null;

// Expose SQLite DB globally for Python syncing
window.getSharedSqliteDb = () => db ? db.export() : null;
window.setSharedSqliteDb = (data) => {
  if (!SQL_module) return;
  if (db) db.close();
  db = new SQL_module.Database(data);
};

export async function buildSqliteView() {
  const sqliteView = document.getElementById('sqlite-view');
  if (!sqliteView) return;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  if (isInitialized) {
    if (codeEditor) {
      codeEditor.setOption("theme", isDark ? "dracula" : "neo");
    }
    return;
  }
  isInitialized = true;

  sqliteView.innerHTML = `
    <div class="python-editor-container">
      <div class="python-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="material-symbols-outlined" style="font-size:1.4rem;">database</span>
          <span class="python-title">SQLite Interactive Console</span>
        </div>
        <button id="run-sqlite-btn" class="run-btn" disabled>
           <span class="material-symbols-outlined" style="font-size:1rem;">hourglass_top</span> Loading WASM...
        </button>
      </div>
      <div class="python-workspace">
        <div class="python-code-area">
          <div class="output-header">
            <span>Query</span>
            <button id="clear-sqlite-code-btn" class="clear-btn" title="Clear Query">
               <span class="material-symbols-outlined" style="font-size:1.1rem;">delete</span>
            </button>
          </div>
          <textarea id="sqlite-code-input"></textarea>
        </div>
        <div class="python-output-area">
          <div class="output-header">
            <span>Query Results</span>
            <button id="clear-sqlite-btn" class="clear-btn" title="Clear History">
               <span class="material-symbols-outlined" style="font-size:1.1rem;">delete</span>
            </button>
          </div>
          <div id="sqlite-output-display" style="flex:1;overflow:auto;padding:12px;background:var(--surface-low);font-family:'JetBrains Mono',monospace;font-size:0.85rem;white-space:pre-wrap;">Initializing WebAssembly SQLite Engine...</div>
        </div>
      </div>
    </div>
  `;

  codeEditor = window.CodeMirror.fromTextArea(document.getElementById('sqlite-code-input'), {
    mode: "text/x-sql",
    theme: isDark ? "dracula" : "neo",
    lineNumbers: true,
    indentUnit: 4,
    matchBrackets: true,
  });
  window.getSqliteCode = () => codeEditor ? codeEditor.getValue() : '';
  window.setSqliteCode = (code) => { if (codeEditor) { codeEditor.setValue(code); setTimeout(()=>codeEditor.refresh(),50); } };

  const defaultCode = `-- Create a sample table
CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, role TEXT);
INSERT INTO employees (name, role) VALUES ('Alice', 'Engineer'), ('Bob', 'Designer');

-- Select data
SELECT * FROM employees;`;
  codeEditor.setValue(defaultCode);
  
  setTimeout(() => codeEditor.refresh(), 100);

  const outputDisplay = document.getElementById('sqlite-output-display');
  const runBtn = document.getElementById('run-sqlite-btn');
  const clearBtn = document.getElementById('clear-sqlite-btn');

  function renderTable(columns, values) {
    if (!columns || !columns.length) return '<i>No rows returned.</i>';
    let html = '<table style="width:100%;border-collapse:collapse;margin-top:8px;">';
    html += '<tr>' + columns.map(c => `<th style="border:1px solid var(--border);padding:4px 8px;background:var(--surface);text-align:left;">${esc(c)}</th>`).join('') + '</tr>';
    values.forEach(row => {
      html += '<tr>' + row.map(v => `<td style="border:1px solid var(--border);padding:4px 8px;">${esc(v)}</td>`).join('') + '</tr>';
    });
    html += '</table>';
    return html;
  }

  function appendOutput(html) {
    const div = document.createElement('div');
    div.style.marginBottom = '16px';
    div.innerHTML = html;
    outputDisplay.appendChild(div);
    outputDisplay.scrollTop = outputDisplay.scrollHeight;
  }

  try {
    const SQL = await window.initSqlJs({
      locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
    });
    SQL_module = SQL;
    db = new SQL.Database();
    
    outputDisplay.innerHTML = '<div style="color:var(--primary);font-weight:bold;">SQLite WebAssembly Ready!</div><br/>';
    runBtn.disabled = false;
    runBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:1.1rem;">play_arrow</span> Execute`;
    runBtn.classList.add('ready');
  } catch (err) {
    outputDisplay.innerHTML = `<div style="color:red;">Error loading SQLite: ${esc(err.message)}</div>`;
  }

  clearBtn.addEventListener('click', () => {
    outputDisplay.innerHTML = '';
    haptic('success');
  });

  const clearCodeBtn = document.getElementById('clear-sqlite-code-btn');
  if (clearCodeBtn) {
    clearCodeBtn.addEventListener('click', () => {
      codeEditor.setValue('');
      haptic('selection');
    });
  }

  runBtn.addEventListener('click', () => {
    haptic('selection');
    if (!db) return;
    
    const code = codeEditor.getValue();
    runBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:1.1rem;">hourglass_top</span> Running...`;
    runBtn.disabled = true;

    setTimeout(() => {
      try {
        appendOutput(`<div style="color:var(--muted);">Executing...</div>`);
        const results = db.exec(code);
        
        if (results.length === 0) {
          appendOutput(`<div style="color:green;">Statement executed successfully (no results).</div>`);
        } else {
          results.forEach(res => {
            appendOutput(renderTable(res.columns, res.values));
          });
        }
      } catch (err) {
        appendOutput(`<div style="color:red;font-weight:bold;">Error: ${esc(err.message)}</div>`);
      } finally {
        runBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:1.1rem;">play_arrow</span> Execute`;
        runBtn.disabled = false;
      }
    }, 50); // slight delay for UI update
  });
}
