import { codeBlockOptions } from '@blocknote/code-block'
import type { CodeBlockOptions } from '@blocknote/core'

const LIGHT_CODE_THEME = 'github-light'
const DARK_CODE_THEME = 'github-dark'

type TolariaCodeHighlighter = Awaited<ReturnType<NonNullable<typeof codeBlockOptions.createHighlighter>>>

function supportsShikiPrecompiledRegexFlags() {
  try {
    new RegExp('', 'd')
    new RegExp('[[]]', 'v')
    return true
  } catch {
    return false
  }
}

function currentCodeBlockTheme() {
  if (typeof document === 'undefined') return LIGHT_CODE_THEME

  const root = document.documentElement
  return root.classList.contains('dark') || root.dataset.theme === 'dark'
    ? DARK_CODE_THEME
    : LIGHT_CODE_THEME
}

function prioritizeTheme(themes: string[], theme: string) {
  return [theme, ...themes.filter((candidate) => candidate !== theme)]
}

async function createTolariaCodeHighlighter(): Promise<TolariaCodeHighlighter> {
  const highlighter = await codeBlockOptions.createHighlighter()
  return {
    ...highlighter,
    getLoadedThemes: () => prioritizeTheme(highlighter.getLoadedThemes(), currentCodeBlockTheme()),
  }
}

// Additional language definitions for syntax highlighting
const ADDITIONAL_LANGUAGES: Record<string, { name: string; aliases?: string[] }> = {
  bash: { name: 'Bash', aliases: ['bash', 'sh', 'shell', 'zsh'] },
  c: { name: 'C', aliases: ['c', 'h'] },
  cpp: { name: 'C++', aliases: ['cpp', 'c++', 'cc', 'cxx', 'hpp'] },
  go: { name: 'Go', aliases: ['go', 'golang'] },
  java: { name: 'Java', aliases: ['java'] },
  kotlin: { name: 'Kotlin', aliases: ['kotlin', 'kt'] },
  php: { name: 'PHP', aliases: ['php'] },
  ruby: { name: 'Ruby', aliases: ['ruby', 'rb'] },
  rust: { name: 'Rust', aliases: ['rust', 'rs'] },
}

export function createTolariaCodeBlockOptions(): Partial<CodeBlockOptions> {
  const options: Partial<CodeBlockOptions> = {
    ...codeBlockOptions,
    createHighlighter: createTolariaCodeHighlighter,
    defaultLanguage: 'text',
    supportedLanguages: {
      ...codeBlockOptions.supportedLanguages,
      ...ADDITIONAL_LANGUAGES,
    },
  }

  if (supportsShikiPrecompiledRegexFlags()) return options

  delete options.createHighlighter
  return options
}
