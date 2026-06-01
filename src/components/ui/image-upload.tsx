"use client"

import * as React from "react"
import { useState } from "react"
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react"
import { createClient } from "@supabase/supabase-js"
import { Label } from "./label"

// Using a direct client just for storage upload if needed, OR we can pass it to an api endpoint.
// For simplicity in a client component, we should POST to an API route to avoid exposing anon key if not initialized standardly,
// OR since it's an authenticated dashboard, we can use the same standard approach.
// But wait, the environment variables for supabase are NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface ImageUploadProps {
  value?: string
  onChange: (url: string) => void
  disabled?: boolean
  /** Bucket de destino no Storage. Default: 'client-logos'. */
  bucket?: string
}

export function ImageUpload({ value, onChange, disabled, bucket = 'client-logos' }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.includes('image/')) {
      setError('Por favor selecione uma imagem.')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Imagem excede 2MB.')
      return
    }

    try {
      setIsUploading(true)
      setError(null)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', bucket)

      const res = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao fazer upload da imagem')
      }

      onChange(data.url)
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Erro ao fazer upload da imagem.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center justify-center w-full">
        <Label 
          htmlFor="dropzone-file" 
          className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors
            ${value ? 'border-plannera-primary/50 bg-plannera-primary/5 hover:bg-plannera-primary/10' : 'border-border-divider bg-surface-card hover:bg-accent/50'}
            ${disabled || isUploading ? 'pointer-events-none opacity-50' : ''}
          `}
        >
          {value ? (
             <div className="w-full h-full relative p-2 flex items-center justify-center group">
               {/* eslint-disable-next-line @next/next/no-img-element */}
               <img 
                 src={value} 
                 alt="Logo" 
                 className="max-h-full max-w-full object-contain" 
                 onError={(e) => {
                   (e.target as HTMLImageElement).style.display = 'none';
                   // Here we could show a placeholder icon but for now we just hide the broken image
                 }}
               />
               <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                 <p className="text-white text-xs font-medium flex gap-2 items-center"><Upload className="w-4 h-4"/> Alterar Imagem</p>
               </div>
             </div>
          ) : (
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {isUploading ? (
                <Loader2 className="w-8 h-8 text-plannera-primary animate-spin mb-2" />
              ) : (
                <ImageIcon className="w-8 h-8 text-content-secondary/40 mb-2" />
              )}
              <p className="mb-1 text-sm text-content-secondary">
                <span className="font-semibold text-plannera-primary">Clique para enviar</span> ou arraste
              </p>
              <p className="text-xs text-content-secondary/60">SVG, PNG, JPG (Max. 2MB)</p>
            </div>
          )}
          <input 
            id="dropzone-file" 
            type="file" 
            accept="image/*"
            className="hidden" 
            onChange={handleUpload}
            disabled={disabled || isUploading}
          />
        </Label>
      </div>
      {value && !disabled && !isUploading && (
        <div className="flex justify-start">
           <button 
             type="button" 
             onClick={(e) => { e.preventDefault(); onChange(""); }}
             className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
           >
             <X className="w-3 h-3" /> Remover logo
           </button>
        </div>
      )}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}
