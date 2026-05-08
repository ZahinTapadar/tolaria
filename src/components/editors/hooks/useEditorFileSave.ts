import { useCallback } from 'react'

async function tauriSaveDialog(defaultPath: string, filters: { name: string; extensions: string[] }[]): Promise<string | null> {
  try {
    const { save } = await import('@tauri-apps/plugin-dialog')
    return await save({ defaultPath, filters }) ?? null
  } catch {
    return null
  }
}

async function tauriWriteTextFile(path: string, content: string): Promise<void> {
  const { writeTextFile } = await import('@tauri-apps/plugin-fs')
  await writeTextFile(path, content)
}

async function tauriWriteBinaryFile(path: string, data: Uint8Array): Promise<void> {
  const { writeFile } = await import('@tauri-apps/plugin-fs')
  await writeFile(path, data)
}

function browserDownloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain' })
  triggerDownload(blob, filename)
}

function browserDownloadBlob(filename: string, blob: Blob) {
  triggerDownload(blob, filename)
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function useEditorFileSave() {
  const saveCode = useCallback(async (code: string, defaultFilename: string, ext: string) => {
    const path = await tauriSaveDialog(defaultFilename, [{ name: ext.toUpperCase(), extensions: [ext] }])
    if (path) {
      try {
        await tauriWriteTextFile(path, code)
        return true
      } catch {
        browserDownloadText(defaultFilename, code)
        return true
      }
    } else {
      browserDownloadText(defaultFilename, code)
      return true
    }
  }, [])

  const saveImage = useCallback(async (base64Data: string, defaultFilename: string) => {
    const binary = atob(base64Data)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

    const path = await tauriSaveDialog(defaultFilename, [{ name: 'PNG Image', extensions: ['png'] }])
    if (path) {
      try {
        await tauriWriteBinaryFile(path, bytes)
        return true
      } catch {
        const blob = new Blob([bytes], { type: 'image/png' })
        browserDownloadBlob(defaultFilename, blob)
        return true
      }
    } else {
      const blob = new Blob([bytes], { type: 'image/png' })
      browserDownloadBlob(defaultFilename, blob)
      return true
    }
  }, [])

  const saveHtml = useCallback(async (html: string, defaultFilename: string) => {
    const path = await tauriSaveDialog(defaultFilename, [{ name: 'HTML', extensions: ['html'] }])
    if (path) {
      try {
        await tauriWriteTextFile(path, html)
        return true
      } catch {
        browserDownloadText(defaultFilename, html)
        return true
      }
    } else {
      browserDownloadText(defaultFilename, html)
      return true
    }
  }, [])

  return { saveCode, saveImage, saveHtml }
}
