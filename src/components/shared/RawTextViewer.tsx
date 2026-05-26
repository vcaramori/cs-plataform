'use client'

import { Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RawTextViewerProps {
  text: string
  title?: string
  filename?: string
}

export function RawTextViewer({ text, title = 'Texto Bruto / Transcrição', filename = 'transcricao.txt' }: RawTextViewerProps) {
  if (!text) return null

  const handleDownload = () => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-content-primary">
          <FileText className="w-4 h-4 text-plannera-orange" />
          <h4 className="text-sm font-bold uppercase tracking-tighter">{title}</h4>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDownload}
          className="h-8 text-[10px] font-black uppercase tracking-wider gap-2 border-border-divider hover:bg-plannera-orange/10 hover:text-plannera-orange hover:border-plannera-orange/30 transition-all"
        >
          <Download className="w-3 h-3" />
          Download .txt
        </Button>
      </div>
      
      <div className="p-4 rounded-xl bg-surface-background/50 border border-border-divider/50 shadow-inner max-h-[300px] overflow-y-auto custom-scrollbar">
        <p className="text-sm font-medium leading-relaxed text-content-secondary whitespace-pre-wrap font-mono text-[11px]">
          {text}
        </p>
      </div>
    </div>
  )
}
