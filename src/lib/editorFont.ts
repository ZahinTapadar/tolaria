export type EditorFontId =
  | 'inter'
  | 'georgia'
  | 'ibm-plex-serif'
  | 'jetbrains-mono'
  | 'lora'

export interface EditorFontDefinition {
  id: EditorFontId
  label: string
  stack: string
  googleFontsUrl?: string
}

export const EDITOR_FONT_DEFINITIONS: EditorFontDefinition[] = [
  {
    id: 'inter',
    label: 'Inter',
    stack: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  {
    id: 'georgia',
    label: 'Georgia',
    stack: "Georgia, 'Times New Roman', serif",
  },
  {
    id: 'ibm-plex-serif',
    label: 'IBM Plex Serif',
    stack: "'IBM Plex Serif', Georgia, serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:ital,wght@0,400;0,600;1,400&display=swap',
  },
  {
    id: 'jetbrains-mono',
    label: 'JetBrains Mono',
    stack: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap',
  },
  {
    id: 'lora',
    label: 'Lora',
    stack: "'Lora', Georgia, serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&display=swap',
  },
]

export const EDITOR_FONT_STORAGE_KEY = 'tolaria-editor-font'
export const DEFAULT_EDITOR_FONT: EditorFontId = 'inter'

const EDITOR_FONT_IDS = new Set<EditorFontId>(EDITOR_FONT_DEFINITIONS.map((def) => def.id))

function safeGetEditorFont(storage: Storage): EditorFontId | null {
  try {
    const raw = storage.getItem(EDITOR_FONT_STORAGE_KEY)
    if (!raw) return null
    return EDITOR_FONT_IDS.has(raw as EditorFontId) ? raw as EditorFontId : null
  } catch {
    return null
  }
}

function safeSetEditorFont(storage: Storage, id: EditorFontId): void {
  try {
    storage.setItem(EDITOR_FONT_STORAGE_KEY, id)
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

export function readStoredEditorFont(storage: Storage): EditorFontId {
  return safeGetEditorFont(storage) ?? DEFAULT_EDITOR_FONT
}

export function writeStoredEditorFont(storage: Storage, id: EditorFontId): void {
  safeSetEditorFont(storage, id)
}

function hashUrl(value: string): string {
  let hash = 5381
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(i)
  }
  return (hash >>> 0).toString(36)
}

function ensureFontLoaded(url: string): void {
  const id = `tolaria-google-font-${hashUrl(url)}`
  if (document.getElementById(id)) return

  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = url
  document.head.appendChild(link)
}

export function applyEditorFontToDocument(doc: Document, id: EditorFontId): void {
  const root = doc.documentElement
  const definition = EDITOR_FONT_DEFINITIONS.find((def) => def.id === id)
    ?? EDITOR_FONT_DEFINITIONS.find((def) => def.id === DEFAULT_EDITOR_FONT)
  if (!definition) return

  if (definition.googleFontsUrl) ensureFontLoaded(definition.googleFontsUrl)
  root.style.setProperty('--font-editor', definition.stack)
}
