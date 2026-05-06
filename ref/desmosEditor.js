import { haptic } from '../features/haptics.js';

let isInitialized = false;
let calculator = null;

/**
 * Interactive Desmos Graphing Calculator workspace.
 * Users can type expressions directly into the Desmos expression panel
 * and see live graph output — analogous to the Python/C++ code editors.
 */
export function buildDesmosView() {
  const desmosView = document.getElementById('desmos-view');
  if (!desmosView) return;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  if (isInitialized) {
    // Just update theme on re-entry
    if (calculator) {
      calculator.updateSettings({
        colors: isDark
          ? { background: '#18241F', grid: '#4B6E60', axes: '#6B9080' }
          : { background: '#EAF4F4', grid: '#A4C3B2', axes: '#547365' }
      });
    }
    return;
  }
  isInitialized = true;

  desmosView.innerHTML = `
    <div class="desmos-editor-container">
      <div class="desmos-editor-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="material-symbols-outlined" style="font-size:1.4rem;">show_chart</span>
          <span class="desmos-editor-title">Desmos Graphing Calculator</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <button id="desmos-example-btn" class="desmos-action-btn" title="Load Example">
            <span class="material-symbols-outlined" style="font-size:1rem;">auto_fix_high</span> Example
          </button>
          <button id="desmos-reset-btn" class="desmos-action-btn desmos-reset" title="Reset Calculator">
            <span class="material-symbols-outlined" style="font-size:1rem;">restart_alt</span> Reset
          </button>
        </div>
      </div>
      <div class="desmos-editor-body">
        <div id="desmos-calc-mount" class="desmos-calc-mount"></div>
      </div>
    </div>
  `;

  // Mount Desmos calculator with full expression panel
  const mount = document.getElementById('desmos-calc-mount');
  if (!mount || typeof Desmos === 'undefined') {
    mount.innerHTML = '<div style="padding:2rem;color:var(--muted);text-align:center;">Desmos API not loaded.</div>';
    return;
  }

  calculator = Desmos.GraphingCalculator(mount, {
    keypad: true,
    expressions: true,
    settingsMenu: true,
    zoomButtons: true,
    expressionsTopbar: true,
    colors: isDark
      ? { background: '#18241F', grid: '#4B6E60', axes: '#6B9080' }
      : { background: '#EAF4F4', grid: '#A4C3B2', axes: '#547365' }
  });

  // Set a default expression so it's not empty
  calculator.setExpression({ id: 'default-1', latex: 'y = \\sin(x)', color: '#4A90D9' });

  // Example button: load a set of interesting expressions
  document.getElementById('desmos-example-btn')?.addEventListener('click', () => {
    haptic('selection');
    calculator.setBlank();
    calculator.setExpression({ id: 'ex-1', latex: 'f(x) = \\sin(x)', color: '#4A90D9' });
    calculator.setExpression({ id: 'ex-2', latex: 'g(x) = \\cos(x)', color: '#E84393' });
    calculator.setExpression({ id: 'ex-3', latex: 'h(x) = x^2 - 2', color: '#7ED321' });
    calculator.setExpression({ id: 'ex-4', latex: '(x-1)^2 + (y-1)^2 = 4', color: '#F5A623' });
    calculator.setExpression({ id: 'ex-5', latex: 'y = \\frac{1}{x}', color: '#BD10E0' });
    calculator.setMathBounds({ left: -6, right: 6, bottom: -4, top: 6 });
  });

  // Reset button: clear all expressions
  document.getElementById('desmos-reset-btn')?.addEventListener('click', () => {
    haptic('success');
    calculator.setBlank();
    calculator.setExpression({ id: 'default-1', latex: 'y = \\sin(x)', color: '#4A90D9' });
  });
}
