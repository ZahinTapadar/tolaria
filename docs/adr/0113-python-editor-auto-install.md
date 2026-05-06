---
type: ADR
id: "0113"
title: "Python Editor Auto-Install and Save Functionality"
status: active
date: 2026-05-06
---

## Context

The Python editor in Tolaria uses Pyodide (WebAssembly Python) which requires manual package installation. Users need to:
1. Manually install packages before running code
2. Save Python code and generated outputs to vault notes
3. Have a way to close the note panel when using code editors

## Decision

**Implement automatic package detection and installation, plus save-to-vault functionality for Python code and outputs.**

### Features

1. **Auto-install**: Parse Python code for `import` statements, automatically install missing packages via micropip
2. **Save Code**: Save Python code as a markdown note with embedded plots
3. **Save Images**: Save generated plots (matplotlib + plotly) as separate notes
4. **Close Button**: Add X button to right pane for closing notes when in editor mode

### Technical Implementation

- `usePyodide` hook extended with `installPackage`, `installPackagesFromCode`, `runPythonWithAutoInstall`
- PythonEditor.tsx UI updated with Save Code and Save Images buttons
- Plotly modebar configured with download button for PNG export
- EditorContainer.tsx receives `onCloseRightPane` prop for closing notes

## Options considered

- **Option A** (chosen): Integrated auto-install with progress feedback — Pros: User-friendly, no manual steps; Cons: Slower first run, network dependency
- **Option B**: Manual package management UI — Pros: Explicit control; Cons: Friction, complexity
- **Option C**: Pre-bundled common packages — Pros: Fast startup; Cons: Large bundle, limited packages

## Consequences

**Easier:**
- Running Python without knowing about micropip
- Capturing and reusing generated plots
- Managing editor/note layout

**Harder:**
- First-run package downloads
- Error handling for network failures

## Advice

User requested for data analysis workflows. Pattern follows Jupyter notebook conventions.
