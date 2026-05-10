#!/usr/bin/env python3
"""
import_to_tolaria.py
--------------------
Converts a Curated/BearNotes notes.json export into plain Markdown files
that Tolaria can read natively.

Each note becomes a .md file with YAML frontmatter:
  ---
  title: Note Title
  created: 2026-01-01T00:00:00+00:00
  modified: 2026-01-01T00:00:00+00:00
  pinned: false
  tags: [tag1, tag2]
  ---
  Body content...

Image references that point to /images/NOTE_ID/filename.png are rewritten
to use a relative path so Tolaria can find them alongside the note.
Images are copied from the Curated public/images/ directory into the vault.

Usage:
    python3 import_to_tolaria.py \
        --notes  /path/to/vercel-app/public/notes.json \
        --images /path/to/vercel-app/public/images \
        --vault  /path/to/tolaria/vault \
        --dry-run

Options:
    --notes     Path to notes.json (required)
    --images    Path to the public/images directory from Curated (optional)
    --vault     Path to the Tolaria vault directory (required)
    --subdir    Subdirectory inside vault to write notes into (default: "")
    --dry-run   Print actions without writing any files
    --overwrite Overwrite existing .md files (default: skip)
"""

import argparse
import json
import os
import re
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def sanitize_filename(title: str) -> str:
    """
    Turn a note title into a safe filename.
    Replaces characters that are illegal on macOS/Windows/Linux.
    Collapses whitespace. Truncates to 200 chars to stay well under FS limits.
    """
    # Replace path separators and null bytes unconditionally
    cleaned = title.replace("/", "-").replace("\\", "-").replace("\x00", "")
    # Replace characters illegal on Windows (also catches macOS edge cases)
    cleaned = re.sub(r'[<>:"|?*]', "-", cleaned)
    # Collapse runs of whitespace/dashes
    cleaned = re.sub(r"[\s\-]+", " ", cleaned).strip(" -")
    if not cleaned:
        cleaned = "Untitled"
    return cleaned[:200]


def unique_path(directory: Path, stem: str, suffix: str = ".md") -> Path:
    """
    Return a path that does not already exist in directory.
    Appends (2), (3), … if needed.
    """
    candidate = directory / f"{stem}{suffix}"
    if not candidate.exists():
        return candidate
    counter = 2
    while True:
        candidate = directory / f"{stem} ({counter}){suffix}"
        if not candidate.exists():
            return candidate
        counter += 1


def rewrite_image_refs(body: str, note_id: str, note_asset_dir: str) -> str:
    """
    Rewrite image/video/PDF references from Curated's URL format to Tolaria markdown.

    Curated stores attachments as:
        /images/NOTE_ID/filename.ext          (absolute from public/)
        https://bearandroid.vercel.app/images/...  (full URL variant)

    Tolaria uses standard markdown image syntax with attachments/ prefix.
    Files are placed in vault/attachments/NOTE_ID/ and referenced as:
    ![](attachments/NOTE_ID/filename.png)
    """
    # Match ![alt](/images/NOTE_ID/file.ext) or ![alt](https://host/images/NOTE_ID/file.ext)
    image_pattern = re.compile(
        r'!\[([^\]]*)\]\(((?:https?://[^/]+)?/images/[^/]+/([^)]+))\)'
    )
    # Match [label](/images/NOTE_ID/file.ext) for PDFs/videos
    link_pattern = re.compile(
        r'(?<!!)\[([^\]]*)\]\(((?:https?://[^/]+)?/images/[^/]+/([^)]+))\)'
    )

    def replace_image(m):
        alt = m.group(1)
        # URL-decode the filename (e.g., %20 -> space, %40 -> @)
        filename = unquote(m.group(3))
        # Tolaria uses standard markdown: ![](attachments/NOTE_ID/filename.png)
        new_ref = f"attachments/{note_asset_dir}/{filename}" if note_asset_dir else f"attachments/{filename}"
        return f"![{alt}]({new_ref})"

    def replace_link(m):
        label = m.group(1)
        # URL-decode the filename
        filename = unquote(m.group(3))
        # For regular links (PDFs, videos), keep as markdown link but point to attachments
        new_ref = f"attachments/{note_asset_dir}/{filename}" if note_asset_dir else f"attachments/{filename}"
        return f"[{label}]({new_ref})"

    body = image_pattern.sub(replace_image, body)
    body = link_pattern.sub(replace_link, body)
    return body


def build_frontmatter(note: dict) -> str:
    """
    Build a YAML frontmatter block from the note's metadata.
    Tolaria reads: title, created, modified, pinned, tags (and ignores extras).
    """
    lines = ["---"]

    title = note.get("title") or "Untitled"
    # YAML-escape titles that contain colons or quotes
    if ":" in title or '"' in title or "'" in title or title.startswith("{"):
        title_yaml = json.dumps(title)  # produces a valid JSON/YAML double-quoted string
    else:
        title_yaml = title
    lines.append(f"title: {title_yaml}")

    created = note.get("created") or datetime.now(tz=timezone.utc).isoformat()
    modified = note.get("modified") or created
    lines.append(f"created: {created}")
    lines.append(f"modified: {modified}")

    pinned = note.get("pinned", False)
    lines.append(f"pinned: {'true' if pinned else 'false'}")

    tags = note.get("tags") or []
    if tags:
        tag_list = ", ".join(f'"{t}"' for t in tags)
        lines.append(f"tags: [{tag_list}]")
    else:
        lines.append("tags: []")

    # Preserve the original Bear/Curated UUID so backlinks stay resolvable
    note_id = note.get("id")
    if note_id:
        lines.append(f"bear_id: {note_id}")

    if note.get("encrypted"):
        lines.append("encrypted: true")

    lines.append("---")
    return "\n".join(lines)


def copy_note_assets(
    source_images_dir: Path,
    note_id: str,
    dest_asset_dir: Path,
    dry_run: bool,
) -> int:
    """
    Copy all files from source_images_dir/note_id/ to dest_asset_dir/.
    Returns the count of files copied (or that would be copied in dry-run).
    """
    source_dir = source_images_dir / note_id
    if not source_dir.exists():
        return 0

    files = [f for f in source_dir.iterdir() if f.is_file()]
    if not files:
        return 0

    if not dry_run:
        dest_asset_dir.mkdir(parents=True, exist_ok=True)

    count = 0
    for f in files:
        # URL-decode the filename for the destination (e.g., %20 -> space)
        decoded_name = unquote(f.name)
        dest = dest_asset_dir / decoded_name
        if not dry_run:
            shutil.copy2(f, dest)
        count += 1

    return count


# ---------------------------------------------------------------------------
# Main import logic
# ---------------------------------------------------------------------------

def import_notes(
    notes_path: str,
    images_path: str | None,
    vault_path: str,
    subdir: str = "",
    dry_run: bool = False,
    overwrite: bool = False,
) -> None:
    notes_file = Path(notes_path)
    if not notes_file.exists():
        print(f"❌ notes.json not found: {notes_path}")
        sys.exit(1)

    with open(notes_file, encoding="utf-8") as f:
        data = json.load(f)

    notes = data.get("notes", [])
    exported_at = data.get("exported_at", "unknown")
    print(f"📂 Loaded {len(notes)} notes (exported {exported_at})")

    vault_dir = Path(vault_path)
    if not vault_dir.exists():
        print(f"❌ Vault directory not found: {vault_path}")
        sys.exit(1)

    write_dir = vault_dir / subdir if subdir else vault_dir
    if not dry_run:
        write_dir.mkdir(parents=True, exist_ok=True)

    source_images_dir = Path(images_path) if images_path else None
    if source_images_dir and not source_images_dir.exists():
        print(f"⚠️  Images directory not found: {images_path} — skipping asset copy")
        source_images_dir = None

    stats = {
        "written": 0,
        "skipped": 0,
        "overwritten": 0,
        "assets_copied": 0,
        "encrypted_skipped": 0,
    }

    for note in notes:
        note_id = note.get("id", "")
        title = note.get("title") or "Untitled"
        body = note.get("body") or ""

        if note.get("encrypted"):
            print(f"  🔒 Skipping encrypted note: {title[:60]}")
            stats["encrypted_skipped"] += 1
            continue

        stem = sanitize_filename(title)

        # Asset directory name (relative, used in rewritten image refs)
        # We use "attachments/NOTE_ID" as the relative path from the note file.
        note_asset_subpath = f"{note_id}" if note_id else ""
        dest_asset_dir = write_dir / "attachments" / note_id if note_id else write_dir / "attachments"

        # Rewrite image/attachment refs before building file content
        if note_id:
            body = rewrite_image_refs(body, note_id, note_asset_subpath)

        frontmatter = build_frontmatter(note)
        content = f"{frontmatter}\n\n{body}\n"

        # Determine output path
        if overwrite:
            out_path = write_dir / f"{stem}.md"
            # Still need to avoid collision with a different note having same title
            # Use unique_path only when the existing file has a different bear_id
            existing = out_path
            if existing.exists() and not dry_run:
                # Check if it's the same note (same bear_id in frontmatter)
                existing_text = existing.read_text(encoding="utf-8")
                if f"bear_id: {note_id}" not in existing_text:
                    out_path = unique_path(write_dir, stem)
        else:
            out_path = unique_path(write_dir, stem)
            # If exact path exists and we're not overwriting, skip
            exact = write_dir / f"{stem}.md"
            if exact.exists():
                print(f"  ⏭  Skipping (exists): {stem}.md")
                stats["skipped"] += 1
                continue

        action = "overwrite" if (out_path.exists() and overwrite) else "write"

        if dry_run:
            print(f"  {'[DRY]':6} {action:10} → {out_path.relative_to(vault_dir)}")
        else:
            out_path.write_text(content, encoding="utf-8")
            if action == "overwrite":
                stats["overwritten"] += 1
            else:
                stats["written"] += 1

        # Copy assets
        if source_images_dir and note_id:
            copied = copy_note_assets(
                source_images_dir, note_id, dest_asset_dir, dry_run
            )
            if copied > 0:
                stats["assets_copied"] += copied
                rel = dest_asset_dir.relative_to(vault_dir)
                verb = "[DRY] would copy" if dry_run else "copied"
                print(f"    🖼  {verb} {copied} asset(s) → {rel}/")

    # Summary
    print()
    print("─" * 50)
    if dry_run:
        print("🧪 Dry run — no files written")
    else:
        print(f"✅ Written:          {stats['written']}")
        print(f"✏️  Overwritten:      {stats['overwritten']}")
        print(f"⏭  Skipped:          {stats['skipped']}")
        print(f"🔒 Encrypted:        {stats['encrypted_skipped']}")
        print(f"🖼  Assets copied:    {stats['assets_copied']}")
    print("─" * 50)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args():
    parser = argparse.ArgumentParser(
        description="Import Curated/BearNotes notes.json into a Tolaria vault"
    )
    parser.add_argument(
        "--notes",
        required=True,
        help="Path to notes.json (e.g. vercel-app/public/notes.json)",
    )
    parser.add_argument(
        "--images",
        default=None,
        help="Path to the public/images directory from Curated (optional)",
    )
    parser.add_argument(
        "--vault",
        required=True,
        help="Path to your Tolaria vault directory",
    )
    parser.add_argument(
        "--subdir",
        default="",
        help='Subdirectory inside vault to write notes into (e.g. "Imported")',
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=False,
        help="Print what would happen without writing any files",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        default=False,
        help="Overwrite existing .md files (default: skip them)",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    import_notes(
        notes_path=args.notes,
        images_path=args.images,
        vault_path=args.vault,
        subdir=args.subdir,
        dry_run=args.dry_run,
        overwrite=args.overwrite,
    )
