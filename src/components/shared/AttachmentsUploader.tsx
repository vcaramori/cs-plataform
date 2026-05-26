'use client'

import { useState, useRef } from 'react'
import { UploadCloud, X, File, Image as ImageIcon, Video, FileAudio, Loader2 } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface AttachmentsUploaderProps {
  onUploadComplete: (urls: string[]) => void
  onUploadingChange?: (isUploading: boolean) => void
  maxSizeMB?: number
}

export function AttachmentsUploader({ onUploadComplete, onUploadingChange, maxSizeMB = 100 }: AttachmentsUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<{name: string, url: string}[]>([])
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const supabase = getSupabaseBrowserClient()

  const handleUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return
    setIsUploading(true)
    if (onUploadingChange) onUploadingChange(true)

    const newUrls: string[] = []
    const newUploadedFiles = [...uploadedFiles]

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.size > maxSizeMB * 1024 * 1024) {
        alert(`Arquivo ${file.name} excede o limite de ${maxSizeMB}MB.`)
        continue
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${fileName}`

      const { data, error } = await supabase.storage
        .from('attachments')
        .upload(filePath, file)

      if (error) {
        console.error('Erro no upload:', error)
        alert(`Falha ao enviar ${file.name}`)
      } else if (data) {
        const { data: publicData } = supabase.storage.from('attachments').getPublicUrl(filePath)
        if (publicData) {
          newUrls.push(publicData.publicUrl)
          newUploadedFiles.push({ name: file.name, url: publicData.publicUrl })
        }
      }
    }

    setUploadedFiles(newUploadedFiles)
    onUploadComplete(newUrls)
    setIsUploading(false)
    if (onUploadingChange) onUploadingChange(false)
  }

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) return <ImageIcon className="w-4 h-4 text-blue-400" />
    if (['mp4', 'mov', 'avi', 'webm'].includes(ext || '')) return <Video className="w-4 h-4 text-purple-400" />
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext || '')) return <FileAudio className="w-4 h-4 text-green-400" />
    return <File className="w-4 h-4 text-gray-400" />
  }

  return (
    <div className="space-y-4">
      <div 
        className={`border-2 border-dashed rounded-xl p-3 text-center transition-all ${
          dragActive 
            ? 'border-plannera-orange bg-plannera-orange/5 scale-[1.02]' 
            : 'border-border-divider/50 hover:border-plannera-orange/50 hover:bg-white/5'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragActive(false)
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleUpload(e.dataTransfer.files)
          }
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={inputRef} 
          className="hidden" 
          multiple 
          onChange={(e) => e.target.files && handleUpload(e.target.files)}
        />
        
        <div className="flex items-center justify-center gap-3 cursor-pointer py-1">
          {isUploading ? (
            <Loader2 className="w-5 h-5 text-plannera-orange animate-spin" />
          ) : (
            <UploadCloud className="w-5 h-5 text-content-secondary/50" />
          )}
          <div className="text-left">
            <p className="text-xs font-bold text-content-primary">
              {isUploading ? 'Enviando arquivos...' : 'Clique ou arraste mídias aqui'}
            </p>
            <p className="text-[9px] font-medium text-content-secondary uppercase tracking-widest mt-0.5">
              Imagens, Áudios ou Vídeos (Max {maxSizeMB}MB)
            </p>
          </div>
        </div>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {uploadedFiles.map((file, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-surface-background/50 border border-border-divider/50 rounded-lg px-3 py-2 text-xs font-medium text-content-primary shadow-sm">
              {getFileIcon(file.name)}
              <span className="truncate max-w-[150px]">{file.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
