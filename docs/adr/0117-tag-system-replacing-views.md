---
type: ADR
id: "0117"
title: "Tag System Replacing Views"
status: active
date: 2026-05-06
---

## Context

The current "views" system in Tolaria is confusing and doesn't work well for users. Views are YAML-based query definitions that filter and display notes, but they have several issues:

- Complex YAML syntax that's hard to write and remember
- Unclear relationship between views and the notes they display
- No visual indication of which notes belong to which view
- Difficult to discover and navigate views

## Decision

**Replace the views system with a tag-based categorization system using hashtags in note content.**

### Tag System Design

1. **Hashtag format**: `#tag-name` anywhere in note content
2. **Tag storage**: Tags are parsed from content and stored in frontmatter `tags: [tag1, tag2]`
3. **Tag navigation**: Sidebar shows tag list instead of views
4. **Tag pages**: Clicking a tag shows all notes with that tag
5. **Multiple tags**: Notes can have unlimited tags

### Example Usage

```markdown
---
title: Project Alpha Plan
tags: [project-alpha, planning, q3-2024]
---

# Project Alpha Plan

This is the main plan for #project-alpha for #q3-2024.

Key objectives:
- Launch by September #milestone
- Budget approval #finance
```

### Tag Rules

- Tags are lowercase with hyphens for spaces: `#my-tag-name`
- Tags can appear anywhere in content (inline, headers, lists)
- Tags are automatically extracted and synced to frontmatter
- Clicking a tag in content jumps to tag page
- Tag page shows: all notes with tag, related tags, tag cloud

### Sidebar Changes

- Remove "Views" section
- Add "Tags" section with:
  - Alphabetical tag list
  - Recently used tags
  - Tag cloud (optional view)

### Migration Path

1. Phase 1: Implement tag system alongside views
2. Phase 2: Auto-convert views to tags where possible
3. Phase 3: Deprecate views, full tag adoption

## Options considered

- **Option A** (chosen): Hashtag-based tags — Pros: Familiar, inline with content, searchable; Cons: Parsing complexity
- **Option B**: Keep YAML views, improve UI — Pros: Structured queries; Cons: Still complex, hard to discover
- **Option C**: Property-based tags (frontmatter only) — Pros: Clean separation; Cons: Not visible in content, harder to add

## Consequences

**Easier:**
- Adding notes to collections (just type #tag)
- Discovering related content
- Ad-hoc organization without planning
- Mobile-friendly (simple text entry)

**Harder:**
- Complex queries (filters, sorting) — may need tag combinations
- Tag parsing and sync with frontmatter
- Backwards compatibility with existing views

**Risks:**
- Tag sprawl (too many tags)
- Tag naming inconsistency
- Performance with many tags

**Trigger for re-evaluation:**
- Tag performance issues with large vaults
- User requests for complex filtering beyond tags
- Need for view-like saved searches

## Advice

User-requested replacement for views system. Pattern follows social media hashtag conventions for familiarity.
