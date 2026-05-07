import {
  Folder, Image, Film, Music, FileText, File,
  FileSpreadsheet, FileArchive, FileCode, BookOpen
} from 'lucide-react'
import { getFileCategory, type FileCategory } from '@/lib/utils'

const iconConfig: Record<FileCategory, { icon: typeof File; color: string }> = {
  folder: { icon: Folder, color: 'text-amber-500' },
  image: { icon: Image, color: 'text-emerald-500' },
  video: { icon: Film, color: 'text-purple-500' },
  audio: { icon: Music, color: 'text-pink-500' },
  pdf: { icon: BookOpen, color: 'text-red-500' },
  doc: { icon: FileText, color: 'text-blue-500' },
  spreadsheet: { icon: FileSpreadsheet, color: 'text-green-600' },
  archive: { icon: FileArchive, color: 'text-orange-500' },
  code: { icon: FileCode, color: 'text-cyan-500' },
  text: { icon: FileText, color: 'text-slate-500' },
  file: { icon: File, color: 'text-slate-400' }
}

export function FileIcon({ name, isFolder, size = 'sm' }: { name: string; isFolder: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const category = getFileCategory(name, isFolder)
  const { icon: Icon, color } = iconConfig[category]
  const sizeClass = size === 'lg' ? 'h-8 w-8' : size === 'md' ? 'h-5 w-5' : 'h-4 w-4'

  return <Icon className={`${sizeClass} ${color} flex-shrink-0`} />
}
