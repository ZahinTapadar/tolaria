import { useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { isTauri } from '../../../mock-tauri'
import { joinVaultPath } from '../../../utils/notePathIdentity'
import { slugifyNoteStem } from '../../../utils/noteSlug'
import type { VaultEntry } from '../../../types'
import { buildNewEntry } from '../../../hooks/useNoteCreation'

export interface EditorVaultSaveDeps {
  vaultPath: string
  addEntry: (entry: VaultEntry) => void
  addPendingSave: (path: string) => void
  onNewNotePersisted: (path: string) => void
}

async function writeNoteFile(path: string, content: string, vaultPath: string): Promise<void> {
  if (!isTauri()) return
  await invoke<void>('create_note_content', { path, content, vaultPath })
}

async function saveImageToVault(vaultPath: string, filename: string, base64Data: string): Promise<string> {
  return invoke<string>('save_image', { vaultPath, filename, data: base64Data })
}

function buildCodeNote(title: string, code: string, language: string): string {
  return `---\ntitle: ${title}\ntype: Code\n---\n\n# ${title}\n\n\`\`\`${language}\n${code}\n\`\`\`\n`
}

function makeCodeEntry(title: string, slug: string, vaultPath: string): VaultEntry {
  const path = joinVaultPath(vaultPath, `codes/${slug}.md`)
  const now = Math.floor(Date.now() / 1000)
  return {
    ...buildNewEntry({ path, slug, title, type: 'Code', status: null }),
    modifiedAt: now,
    createdAt: now,
  }
}

function makeAttachmentEntry(title: string, slug: string, vaultPath: string): VaultEntry {
  const path = joinVaultPath(vaultPath, `codes/${slug}.md`)
  const now = Math.floor(Date.now() / 1000)
  return {
    ...buildNewEntry({ path, slug, title, type: 'Attachment', status: null }),
    modifiedAt: now,
    createdAt: now,
  }
}

function buildAttachmentNote(title: string, imageFilename: string): string {
  return `---\ntitle: ${title}\ntype: Attachment\n---\n\n# ${title}\n\n![[${imageFilename}]]\n`
}

function uniqueSlug(base: string): string {
  return `${slugifyNoteStem(base)}-${Math.floor(Date.now() / 1000)}`
}

export function useEditorVaultSave(deps: EditorVaultSaveDeps | null) {
  const saveCodeNote = useCallback(async (code: string, language: 'python' | 'sql') => {
    if (!deps) return
    const { vaultPath, addEntry, addPendingSave, onNewNotePersisted } = deps
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
    const title = `${language === 'python' ? 'Python' : 'SQLite'} — ${timestamp}`
    const slug = uniqueSlug(language === 'python' ? 'python-script' : 'sqlite-query')
    const entry = makeCodeEntry(title, slug, vaultPath)
    const content = buildCodeNote(title, code, language === 'python' ? 'python' : 'sql')

    addPendingSave(entry.path)
    try {
      await writeNoteFile(entry.path, content, vaultPath)
      addEntry(entry)
      onNewNotePersisted(entry.path)
    } catch {
      // Silent — manual save fallback still works.
    }
  }, [deps])

  const saveImageWithNote = useCallback(async (base64Data: string, index: number) => {
    if (!deps) return
    const { vaultPath, addEntry, addPendingSave, onNewNotePersisted } = deps
    const ts = Math.floor(Date.now() / 1000)
    const imageFilename = `plot-${ts}-${index + 1}.png`
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
    const title = `Plot ${index + 1} — ${timestamp}`
    const slug = uniqueSlug(`plot-${index + 1}`)

    try {
      await saveImageToVault(vaultPath, imageFilename, base64Data)
    } catch {
      return
    }

    const entry = makeAttachmentEntry(title, slug, vaultPath)
    const content = buildAttachmentNote(title, imageFilename)

    addPendingSave(entry.path)
    try {
      await writeNoteFile(entry.path, content, vaultPath)
      addEntry(entry)
      onNewNotePersisted(entry.path)
    } catch {
      // Silent.
    }
  }, [deps])

  return { saveCodeNote, saveImageWithNote }
}
