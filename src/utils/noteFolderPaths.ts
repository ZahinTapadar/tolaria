/**
 * Note Folder Path Utilities
 * 
 * Implements ADR-0116: Hierarchical folder organization for notes, code, and assets.
 * 
 * Structure:
 * vault/
 * ├── Notes/
 * │   └── {Note-Title}/
 * │       ├── {Note-Title}.md
 * │       └── attachments/
 * │           ├── image.png
 * │           ├── video.mp4
 * │           └── audio.mp3
 * ├── Code/
 * │   └── {Script-Name}/
 * │       ├── {Script-Name}.md
 * │       └── attachments/
 * └── (other files at root)
 */

import { invoke } from '@tauri-apps/api/core'

/**
 * Sanitize a title for use as a folder name
 * Removes/replaces characters that are problematic for filesystems
 */
export function sanitizeFolderName(title: string): string {
  return title
    .replace(/[<>:"/\\|?*]/g, '-')  // Replace invalid chars with dash
    .replace(/\s+/g, ' ')            // Collapse multiple spaces
    .trim()                           // Remove leading/trailing spaces
    .substring(0, 100)                // Limit length
}

/**
 * Generate unique folder name if collision exists
 * Appends timestamp or counter to avoid overwriting
 */
export function generateUniqueFolderName(baseName: string, existingNames: Set<string>): string {
  if (!existingNames.has(baseName)) {
    return baseName
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const withTimestamp = `${baseName}-${timestamp}`
  
  if (!existingNames.has(withTimestamp)) {
    return withTimestamp
  }
  
  // Fallback: append counter
  let counter = 1
  while (existingNames.has(`${baseName}-${counter}`)) {
    counter++
  }
  return `${baseName}-${counter}`
}

/**
 * Get path for a new note in the Notes folder structure
 */
export function getNoteFolderPaths(vaultRoot: string, title: string): {
  folderPath: string
  notePath: string
  attachmentsPath: string
} {
  const sanitizedTitle = sanitizeFolderName(title)
  const folderName = sanitizedTitle || 'Untitled'
  
  return {
    folderPath: `${vaultRoot}/Notes/${folderName}`,
    notePath: `${vaultRoot}/Notes/${folderName}/${folderName}.md`,
    attachmentsPath: `${vaultRoot}/Notes/${folderName}/attachments`,
  }
}

/**
 * Get path for a new code script in the Code folder structure
 */
export function getCodeFolderPaths(vaultRoot: string, title: string): {
  folderPath: string
  codePath: string
  attachmentsPath: string
} {
  const sanitizedTitle = sanitizeFolderName(title)
  const folderName = sanitizedTitle || 'Untitled-Script'
  
  return {
    folderPath: `${vaultRoot}/Code/${folderName}`,
    codePath: `${vaultRoot}/Code/${folderName}/${folderName}.md`,
    attachmentsPath: `${vaultRoot}/Code/${folderName}/attachments`,
  }
}

/**
 * Ensure directory exists (create if needed)
 * Uses Tauri's create_dir_all command
 */
export async function ensureDirectory(path: string): Promise<void> {
  try {
    await invoke('create_dir_all', { path })
  } catch (err) {
    // Directory might already exist, which is fine
    if (!(err instanceof Error && err.message.includes('already exists'))) {
      throw err
    }
  }
}

/**
 * Generate attachment filename with proper extension
 */
export function generateAttachmentFilename(
  originalName: string,
  type: 'image' | 'video' | 'audio' | 'file'
): string {
  const timestamp = Date.now()
  const extension = originalName.split('.').pop() || getDefaultExtension(type)
  const baseName = originalName.split('.')[0] || `${type}-${timestamp}`
  
  return `${baseName}-${timestamp}.${extension}`
}

function getDefaultExtension(type: 'image' | 'video' | 'audio' | 'file'): string {
  switch (type) {
    case 'image': return 'png'
    case 'video': return 'mp4'
    case 'audio': return 'mp3'
    case 'file': return 'bin'
    default: return 'bin'
  }
}

/**
 * Get relative path for referencing an attachment from a note
 */
export function getAttachmentReferencePath(
  _noteFolderName: string,
  attachmentFilename: string
): string {
  return `./attachments/${attachmentFilename}`
}
