import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function formatDate(date: string | null): string {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}

export type FileCategory = 'folder' | 'image' | 'video' | 'audio' | 'pdf' | 'doc' | 'spreadsheet' | 'archive' | 'code' | 'text' | 'file'

export function getFileCategory(key: string, isFolder: boolean): FileCategory {
  if (isFolder) return 'folder'
  const ext = key.split('.').pop()?.toLowerCase() || ''
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) return 'image'
  if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv'].includes(ext)) return 'video'
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(ext)) return 'audio'
  if (ext === 'pdf') return 'pdf'
  if (['doc', 'docx', 'odt', 'rtf'].includes(ext)) return 'doc'
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'spreadsheet'
  if (['zip', 'tar', 'gz', 'rar', '7z', 'bz2', 'xz'].includes(ext)) return 'archive'
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'rb', 'php', 'sh', 'json', 'yaml', 'yml', 'toml', 'xml', 'html', 'css', 'scss', 'sql'].includes(ext)) return 'code'
  if (['txt', 'md', 'log', 'ini', 'cfg', 'conf'].includes(ext)) return 'text'
  return 'file'
}

// Keep for backward compat but prefer FileIcon component
export function getFileIcon(key: string, isFolder: boolean): string {
  const cat = getFileCategory(key, isFolder)
  const map: Record<FileCategory, string> = {
    folder: '📁', image: '🖼️', video: '🎬', audio: '🎵',
    pdf: '📕', doc: '📝', spreadsheet: '📊', archive: '📦',
    code: '⚙️', text: '📃', file: '📄'
  }
  return map[cat]
}
