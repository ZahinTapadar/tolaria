---
type: ADR
id: "0114"
title: "Python Editor Output Capture for Plots"
status: active
date: 2026-05-06
---

## Context

Python code in the editor generates visual outputs via matplotlib and plotly. These need to be:
1. Displayed within the app
2. Capturable for saving to vault notes
3. Exportable as images for use in markdown

## Decision

**Capture matplotlib as base64 PNG and plotly as HTML snippets, with both savable to vault.**

### Implementation

1. **Matplotlib**: Override `plt.show()` to capture buffer and emit base64 PNG via `window.addPythonPlot()`
2. **Plotly**: Override `pio.show()` to generate HTML with CDN-loaded Plotly.js via `window.addPythonHtmlPlot()`
3. **Save handlers**: 
   - Save Code: Embeds both types in markdown (base64 images + HTML)
   - Save Images: Creates separate notes for each plot

### Output Format

```typescript
{
  text: string,      // base64 PNG or HTML snippet
  isError: boolean,
  isImage?: boolean, // true for matplotlib
  isHtml?: boolean   // true for plotly
}
```

## Options considered

- **Option A** (chosen): Dual format capture — Pros: Works with both libraries, native display; Cons: HTML plots need CDN
- **Option B**: Convert all to PNG — Pros: Uniform format; Cons: Loses plotly interactivity
- **Option C**: Store plot data, render on demand — Pros: Smaller storage; Cons: Requires re-execution

## Consequences

**Easier:**
- Mixed matplotlib/plotly workflows
- Direct embedding in notes
- Plotly interactivity preserved

**Harder:**
- Offline usage needs Plotly CDN
- HTML sanitization considerations

## Advice

User specifically wanted plotly HTML support for interactive charts alongside matplotlib static images.
