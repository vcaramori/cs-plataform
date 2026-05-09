'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Download } from 'lucide-react'
import { toast } from 'sonner'

export default function RenewalCockpitClient({ accountId, contract }: any) {
  const [pdfLoading, setPdfLoading] = useState(false)

  const handleDownloadPDF = async () => {
    try {
      setPdfLoading(true)
      const res = await fetch(`/api/accounts/${accountId}/renewal/pdf`, { method: 'POST' })
      const data = await res.json()
      if (data.html) {
        const blob = new Blob([data.html], { type: 'text/html' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = data.filename || 'renewal.html'
        a.click()
        window.URL.revokeObjectURL(url)
        toast.success('PDF gerado!')
      }
    } catch (error) {
      toast.error('Erro ao gerar PDF')
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Cockpit 360 Graus</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <p className='text-slate-600'>6 seções de análise para renovação</p>
          <Button onClick={handleDownloadPDF} disabled={pdfLoading}>
            <Download className='w-4 h-4 mr-2' />
            {pdfLoading ? 'Gerando...' : 'Baixar Brief PDF'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
