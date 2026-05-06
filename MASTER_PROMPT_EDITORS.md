# Master Prompt: Interactive Editor Implementation (Desmos, Python, SQLite, C++)

## Context
We have successfully implemented the Force-Directed Graph View in Tolaria. Now we need to implement 4 additional interactive editors that follow a similar architectural pattern.

Reference implementations exist in `/Users/macbookair/Programming/tolaria/ref/`:
- `pythonEditor.js` - Pyodide-based Python console (most complex)
- `sqliteEditor.js` - sql.js WebAssembly SQLite
- `desmosEditor.js` - Desmos Graphing Calculator
- `cppEditor.js` - Mock C++ compiler (simulation)

## Architecture Pattern (Based on Graph Implementation)

### File Structure
```
src/components/editors/
├── EditorContainer.tsx       # Shared layout shell (similar to GraphView)
├── PythonEditor.tsx          # Python interactive console
├── SqliteEditor.tsx          # SQLite query editor
├── DesmosEditor.tsx          # Desmos calculator
├── CppEditor.tsx             # C++ compiler
├── types.ts                  # Shared editor types
└── hooks/
    ├── usePyodide.ts         # Python runtime management
    ├── useSqlJs.ts           # SQLite WASM initialization
    ├── useDesmos.ts          # Desmos calculator instance
    └── useCodeMirror.ts      # Shared CodeMirror integration
```

### Tech Stack
- **Code Editor**: CodeMirror 6 (via @uiw/react-codemirror or direct)
- **Python**: Pyodide (WebAssembly Python runtime)
- **SQLite**: sql.js (WebAssembly SQLite)
- **Desmos**: Official Desmos API (script loaded dynamically)
- **C++**: Mock simulation (simulated compilation output)
- **UI**: shadcn/ui components, Tailwind CSS
- **State**: React hooks, no external state management needed

---

## Implementation Guide by Editor

### 1. Python Editor

**Core Requirements:**
- Pyodide runtime initialization (lazy-loaded)
- CodeMirror editor with Python syntax highlighting
- Split-pane layout: Files sidebar | Code editor | Console output
- Run button with loading states
- Virtual file system with upload capability
- Auto-package installation (micropip)
- Matplotlib/Plotly output capture (base64/iframe injection)
- SQLite synchronization hooks (shared with SQLite editor)

**Key Features from Reference:**
```typescript
// Window globals for cross-editor sync
window.getPythonCode: () => string
window.setPythonCode: (code: string) => void
window.addPythonPlot: (base64Data: string) => void
window.addPythonHtmlPlot: (html: string) => void
window.getSharedSqliteDb: () => Uint8Array | null
window.setSharedSqliteDb: (data: Uint8Array) => void
```

**Dependencies:**
```bash
pnpm add @codemirror/lang-python
```

---

### 2. SQLite Editor

**Core Requirements:**
- sql.js WASM initialization
- CodeMirror with SQL syntax highlighting
- Split-pane: Query editor | Results table
- Execute button with async handling
- HTML table rendering for query results
- Export/import database capability
- Python synchronization (shared database)

**Key Features:**
```typescript
// Same window globals as Python for sync
window.getSharedSqliteDb: () => Uint8Array | null
window.setSharedSqliteDb: (data: Uint8Array) => void
window.getSqliteCode: () => string
window.setSqliteCode: (code: string) => void
```

**Dependencies:**
```bash
pnpm add sql.js
pnpm add @codemirror/lang-sql
```

---

### 3. Desmos Editor

**Core Requirements:**
- Load Desmos API script dynamically
- Full graphing calculator with expression panel
- Theme-aware colors (dark/light mode)
- Example expressions button
- Reset/clear button
- No CodeMirror needed (Desmos has built-in expression UI)

**Key Features:**
```typescript
const calculator = Desmos.GraphingCalculator(element, {
  keypad: true,
  expressions: true,
  settingsMenu: true,
  zoomButtons: true,
  expressionsTopbar: true,
  colors: isDark ? darkTheme : lightTheme
});
```

**Dependencies:**
- No npm package - load via script tag

---

### 4. C++ Editor

**Core Requirements:**
- CodeMirror with C++ syntax highlighting
- Mock compilation simulation (no real Emscripten toolchain)
- Terminal-style output display
- Compile & Run button with artificial delay
- Default "Hello WebAssembly" example code
- Theme-aware CodeMirror themes

**Key Features:**
- Simulate compilation: [emcc] Compiled successfully to WebAssembly module.
- Fake execution delay (1200ms)
- Simple output capture

**Dependencies:**
```bash
pnpm add @codemirror/lang-cpp
```

---

## Integration Pattern (Follow GraphView Structure)

### 1. Sidebar Navigation
Add to src/components/sidebar/SidebarTopNav.tsx:
```typescript
import { Terminal, Database, Graph as GraphIcon, CodeBlocks } from '@phosphor-icons/react'
```

### 2. Types Extension
Add to src/types.ts:
```typescript
export type EditorSelection =
  | { kind: 'python' }
  | { kind: 'sqlite' }
  | { kind: 'desmos' }
  | { kind: 'cpp' }
```

### 3. App.tsx Integration
Similar to GraphView integration pattern.

### 4. Localization
Add keys to src/lib/locales/en.json following existing patterns.

---

## Implementation Order (Recommended)

1. **SQLite** - Simplest WASM integration, good foundation
2. **C++** - Mock implementation, easy CodeMirror setup
3. **Python** - Most complex, builds on SQLite sync
4. **Desmos** - External API, different pattern entirely

## Success Criteria

- TypeScript compiles without errors
- Each editor lazy-loads its runtime (no bundle bloat)
- Theme switching works (dark/light mode)
- Cross-editor sync works (Python/SQLite)
- Follows GraphView architectural patterns
- All localization keys added
- Sidebar navigation functional
- App.tsx integration complete
