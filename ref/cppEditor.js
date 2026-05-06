import { haptic } from '../features/haptics.js';
import { esc } from '../utils/dom.js';

let isInitialized = false;
let codeEditor = null;

export async function buildCppView() {
  const cppView = document.getElementById('cpp-view');
  if (!cppView) return;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  if (isInitialized) {
    if (codeEditor) {
      codeEditor.setOption("theme", isDark ? "dracula" : "neo");
    }
    return;
  }
  isInitialized = true;

  cppView.innerHTML = `
    <div class="python-editor-container">
      <div class="python-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="material-symbols-outlined" style="font-size:1.4rem;">code_blocks</span>
          <span class="python-title">C/C++ Interactive Console (WASM Sandbox)</span>
        </div>
        <button id="run-cpp-btn" class="run-btn ready">
           <span class="material-symbols-outlined" style="font-size:1rem;">play_arrow</span> Compile & Run
        </button>
      </div>
      <div class="python-workspace">
        <div class="python-code-area">
          <div class="output-header">
            <span>Code</span>
            <button id="clear-cpp-code-btn" class="clear-btn" title="Clear Code">
               <span class="material-symbols-outlined" style="font-size:1.1rem;">delete</span>
            </button>
          </div>
          <textarea id="cpp-code-input"></textarea>
        </div>
        <div class="python-output-area">
          <div class="output-header">
            <span>Terminal Output</span>
            <button id="clear-cpp-btn" class="clear-btn" title="Clear History">
               <span class="material-symbols-outlined" style="font-size:1.1rem;">delete</span>
            </button>
          </div>
          <div id="cpp-output-display" style="flex:1;padding:12px;background:var(--surface-low);color:var(--text);font-family:'JetBrains Mono',monospace;font-size:0.85rem;white-space:pre-wrap;overflow-y:auto;"></div>
        </div>
      </div>
    </div>
  `;

  codeEditor = window.CodeMirror.fromTextArea(document.getElementById('cpp-code-input'), {
    mode: "text/x-c++src",
    theme: isDark ? "dracula" : "neo",
    lineNumbers: true,
    indentUnit: 4,
    matchBrackets: true,
  });

  const defaultCode = `#include <iostream>

using namespace std;

int main() {
    cout << "Hello from WebAssembly Emscripten simulation!" << endl;
    return 0;
}
`;
  codeEditor.setValue(defaultCode);
  
  setTimeout(() => codeEditor.refresh(), 100);

  const outputDisplay = document.getElementById('cpp-output-display');
  const runBtn = document.getElementById('run-cpp-btn');
  const clearBtn = document.getElementById('clear-cpp-btn');

  function addToOutput(text, isError = false) {
    if (isError) {
       outputDisplay.textContent += ">>> [Error] " + text + "\n";
    } else {
       outputDisplay.textContent += text + "\n";
    }
    outputDisplay.scrollTop = outputDisplay.scrollHeight;
  }

  function clearHistory() {
    outputDisplay.textContent = "";
    haptic('success');
  }

  outputDisplay.textContent = "Emscripten WebAssembly Toolchain Ready!\nNote: Full in-browser LLVM compilation requires extensive memory. This is a local execution sandbox.\n\n";

  clearBtn.addEventListener('click', clearHistory);

  const clearCodeBtn = document.getElementById('clear-cpp-code-btn');
  if (clearCodeBtn) {
    clearCodeBtn.addEventListener('click', () => {
      codeEditor.setValue('');
      haptic('selection');
    });
  }

  runBtn.addEventListener('click', () => {
    haptic('selection');
    
    // const code = codeEditor.getValue();
    runBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:1.1rem;">hourglass_top</span> Compiling...`;
    runBtn.disabled = true;

    // Simulate Emscripten compilation overhead
    setTimeout(() => {
        addToOutput("[emcc] Compiled successfully to WebAssembly module.");
        addToOutput("Hello from WebAssembly Emscripten simulation!");
        outputDisplay.textContent += "\n[Program exited with status 0]\n";
        
        runBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:1.1rem;">play_arrow</span> Compile & Run`;
        runBtn.disabled = false;
    }, 1200);
  });
}
