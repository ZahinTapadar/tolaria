---
type: ADR
id: "0116"
title: "Hierarchical Folder Organization for Notes, Code, and Images"
status: active
date: 2026-05-06
---

## Context

Currently, Tolaria stores all notes flat in the vault root, with only "types" (note, code, image) for categorization. Folders exist but are underutilized - they only contain videos and attachments without a systematic structure. This leads to:

- Cluttered root directory with many files
- No clear relationship between notes and their associated images
- Difficulty organizing code outputs alongside their source

## Decision

**Implement a hierarchical folder structure where notes are organized in type-specific folders with per-note subdirectories containing associated assets.**

### Structure

```
vault/
├── Notes/
│   └── {Note-Title}/
│       ├── {Note-Title}.md
│       └── images/
│           └── plot-1.png
│           └── screenshot.jpg
├── Code/
│   └── {Script-Name}/
│       ├── {Script-Name}.md
│       └── outputs/
│           └── plot-1.png
│           └── data.csv
└── (root for other files)
```

### Rules

1. **Two main folders**: `Notes/` and `Code/` (initially)
2. **Per-note folders**: Each note gets a subfolder named after its title (sanitized)
3. **Internal organization**: Each note folder contains:
   - The note file itself (`.md`)
   - An `images/` subfolder for visual assets
4. **Code outputs**: Generated plots/images from code go to the code's `outputs/` folder
5. **Backwards compatibility**: Existing flat-structure notes remain functional

## Options considered

- **Option A** (chosen): Hierarchical folder structure with per-note folders — Pros: Clean organization, clear relationships, scalable; Cons: Migration complexity, longer paths
- **Option B**: Keep flat structure, use YAML metadata only — Pros: Simple, no migration; Cons: Doesn't leverage filesystem, harder to browse externally
- **Option C**: Tag-based organization with virtual folders — Pros: Flexible; Cons: Requires custom UI, loses filesystem benefits

## Consequences

**Easier:**
- Finding related assets for a note
- External file browsing (Finder/Explorer)
- Backup and sync (clearer what belongs together)
- Future features (note bundles, export)

**Harder:**
- Renaming notes requires folder rename
- Path references in notes need updating
- Migration of existing vaults

**Risks:**
- Title collisions (two notes with same title) - append timestamp or counter
- Special characters in titles need sanitization
- Deep nesting could cause path length issues on Windows

**Trigger for re-evaluation:**
- User feedback on navigation complexity
- Performance issues with deep folders
- Need for additional top-level folders

## Advice

Folder organization requested by user for better asset management. Pattern follows "bundle" approach common in modern note apps (Obsidian, Notion export).
