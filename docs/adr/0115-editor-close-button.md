---
type: ADR
id: "0115"
title: "Editor Close Button for Note Pane"
status: active
date: 2026-05-06
---

## Context

When a user opens a note and then switches to a code editor (Python, SQLite, Desmos, C++), the note remains visible in the right pane. There's no way to close it without switching back to notes mode.

## Decision

**Add a close button to the right pane header when in editor mode.**

### Implementation

1. **EditorContainer.tsx**: 
   - Add header bar to right pane with "Note" label
   - X button (Close icon) on the right
   - `onCloseRightPane` prop to handle close action

2. **App.tsx**:
   - Pass `notes.closeAllTabs` as `onCloseRightPane` handler
   - Only shows when `notes.tabs.length > 0`

### UI Placement

```
┌─────────────────┬─────────────────┐
│  Python Editor  │ Note     [X]    │  ← Close button
│                 ├─────────────────┤
│                 │                 │
│                 │ Note content    │
│                 │                 │
└─────────────────┴─────────────────┘
```

## Options considered

- **Option A** (chosen): Header bar with X button — Pros: Clear, discoverable; Cons: Takes minimal space
- **Option B**: Right-click menu — Pros: No UI clutter; Cons: Not discoverable
- **Option C**: Keyboard shortcut only — Pros: Fast for power users; Cons: Not discoverable

## Consequences

**Easier:**
- Managing editor workspace
- Closing notes without context switch
- Consistent with other panel UIs

**Harder:**
- Slightly more complex EditorContainer

## Advice

User requested to maximize editor space when focusing on code.
