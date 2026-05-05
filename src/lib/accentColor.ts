export type AccentColorId =
  | 'apricot'
  | 'coral'
  | 'deep-teal'
  | 'sunflower'
  | 'clay'
  | 'mint'
  | 'sage'

export interface AccentColorDefinition {
  id: AccentColorId
  label: string
  light: { base: string; hover: string; bg: string; light: string }
  dark: { base: string; hover: string; bg: string; light: string }
}

export const ACCENT_COLOR_DEFINITIONS: AccentColorDefinition[] = [
  buildAccentColorDefinition('apricot', 'Apricot', '#F98359'),
  buildAccentColorDefinition('coral', 'Coral', '#FF7759'),
  buildAccentColorDefinition('deep-teal', 'Deep teal', '#0E363D'),
  buildAccentColorDefinition('sunflower', 'Sunflower', '#FFE450'),
  buildAccentColorDefinition('clay', 'Clay', '#C15F3C'),
  buildAccentColorDefinition('mint', 'Mint', '#5AFF88'),
  buildAccentColorDefinition('sage', 'Sage', '#729877'),
]

export const ACCENT_COLOR_STORAGE_KEY = 'tolaria-accent-color'
export const DEFAULT_ACCENT_COLOR: AccentColorId = 'apricot'

const ACCENT_COLOR_IDS = new Set<AccentColorId>(ACCENT_COLOR_DEFINITIONS.map((def) => def.id))

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.trim().replace(/^#/, '')
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null

  const n = Number.parseInt(normalized, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return { r, g, b }
}

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function mixRgb(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }, t: number) {
  return {
    r: clampChannel(a.r + (b.r - a.r) * t),
    g: clampChannel(a.g + (b.g - a.g) * t),
    b: clampChannel(a.b + (b.b - a.b) * t),
  }
}

function rgbToHex(rgb: { r: number; g: number; b: number }): string {
  const value = (rgb.r << 16) | (rgb.g << 8) | rgb.b
  return `#${value.toString(16).padStart(6, '0')}`.toUpperCase()
}

function rgbaString(rgb: { r: number; g: number; b: number }, alpha: number): string {
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`
}

function buildAccentColorDefinition(id: AccentColorId, label: string, baseHex: string): AccentColorDefinition {
  const base = hexToRgb(baseHex) ?? { r: 21, g: 93, b: 255 }
  const black = { r: 0, g: 0, b: 0 }
  const white = { r: 255, g: 255, b: 255 }
  const hoverLight = rgbToHex(mixRgb(base, black, 0.15))
  const hoverDark = rgbToHex(mixRgb(base, white, 0.15))

  return {
    id,
    label,
    light: {
      base: baseHex,
      hover: hoverLight,
      bg: rgbaString(base, 0.2),
      light: rgbaString(base, 0.16),
    },
    dark: {
      base: baseHex,
      hover: hoverDark,
      bg: rgbaString(base, 0.2),
      light: rgbaString(base, 0.16),
    },
  }
}

function safeGetAccentColor(storage: Storage): AccentColorId | null {
  try {
    const raw = storage.getItem(ACCENT_COLOR_STORAGE_KEY)
    if (!raw) return null
    return ACCENT_COLOR_IDS.has(raw as AccentColorId) ? raw as AccentColorId : null
  } catch {
    return null
  }
}

function safeSetAccentColor(storage: Storage, id: AccentColorId): void {
  try {
    storage.setItem(ACCENT_COLOR_STORAGE_KEY, id)
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

export function readStoredAccentColor(storage: Storage): AccentColorId {
  return safeGetAccentColor(storage) ?? DEFAULT_ACCENT_COLOR
}

export function writeStoredAccentColor(storage: Storage, id: AccentColorId): void {
  safeSetAccentColor(storage, id)
}

export function applyAccentColorToDocument(doc: Document, id: AccentColorId): void {
  const root = doc.documentElement
  const definition = ACCENT_COLOR_DEFINITIONS.find((def) => def.id === id)
    ?? ACCENT_COLOR_DEFINITIONS.find((def) => def.id === DEFAULT_ACCENT_COLOR)
  if (!definition) return

  const isDark = root.classList.contains('dark') || root.getAttribute('data-theme') === 'dark'
  const palette = isDark ? definition.dark : definition.light

  root.style.setProperty('--accent-blue', palette.base)
  root.style.setProperty('--accent-blue-hover', palette.hover)
  root.style.setProperty('--accent-blue-bg', palette.bg)
  root.style.setProperty('--accent-blue-light', palette.light)
  root.style.setProperty('--border-focus', palette.base)
  root.style.setProperty('--state-focus-ring', palette.base)
}
