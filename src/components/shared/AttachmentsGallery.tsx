'use client'

import { Download, File, Image as ImageIcon, Video, FileAudio } from 'lucide-react'

interface AttachmentsGalleryProps {
  urls: string[]
}

export function AttachmentsGallery({ urls }: AttachmentsGalleryProps) {
  if (!urls || urls.length === 0) return null

  const getFileIcon = (url: string) => {
    const ext = url.split('.').pop()?.toLowerCase() || ''
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return <ImageIcon className="w-5 h-5 text-blue-400" />
    if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) return <Video className="w-5 h-5 text-purple-400" />
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return <FileAudio className="w-5 h-5 text-green-400" />
    return <File className="w-5 h-5 text-gray-400" />
  }

  const getFileName = (url: string) => {
    try {
      const parts = url.split('/')
      const lastPart = parts[parts.length - 1]
      // Tentar remover o prefixo de timestamp gerado no upload (ex: 1715694200000-abcd.jpg)
      return lastPart.includes('-') ? lastPart.substring(lastPart.indexOf('-') + 1) : lastPart
    } catch {
      return 'Arquivo anexado'
    }
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-bold uppercase tracking-tighter text-content-primary">Mídias Anexadas</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {urls.map((url, idx) => {
          const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(url.split('.').pop()?.toLowerCase() || '')
          
          return (
            <div key={idx} className="group relative flex items-center gap-3 p-3 rounded-xl bg-surface-background/50 border border-border-divider/50 hover:bg-white/5 hover:border-plannera-orange/30 transition-all shadow-sm">
              <div className="shrink-0 p-2 rounded-lg bg-black/20 group-hover:scale-105 transition-transform">
                {getFileIcon(url)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-content-primary truncate" title={getFileName(url)}>
                  {getFileName(url)}
                </p>
                <a 
                  href={url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[10px] font-black uppercase tracking-widest text-plannera-orange hover:text-plannera-orange/80 transition-colors inline-flex items-center gap-1 mt-1"
                >
                  <Download className="w-3 h-3" /> Abrir / Baixar
                </a>
              </div>

              {/* Preview de Imagem Oculto que aparece no Hover */}
              {isImage && (
                <div className="absolute z-50 left-0 top-full mt-2 w-48 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity">
                  <div className="p-1 rounded-xl bg-surface-card border border-border-divider shadow-2xl">
                    <img src={url} alt="Preview" className="w-full h-auto rounded-lg object-cover" />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
