'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export default function NegotiationHistoryForm({ contractId }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    discount_offered_pct: 0,
    discount_accepted_pct: 0,
    main_objection: '',
    closing_argument: '',
    counterpart_name: '',
    counterpart_role: '',
    outcome: 'pending',
    notes: '',
  })

  const { data: history } = useQuery({
    queryKey: ['negotiation-history', contractId],
    queryFn: async () => {
      const res = await fetch(`/api/contracts/${contractId}/negotiation-history`)
      return res.json()
    },
  })

  const { mutate: submit, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/contracts/${contractId}/negotiation-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error('Failed to save')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Negociação registrada!')
      queryClient.invalidateQueries({ queryKey: ['negotiation-history', contractId] })
      setOpen(false)
    },
  })

  return (
    <div>
      <Button onClick={() => setOpen(true)}>Registrar Negociação</Button>
      {open && (
        <div className='space-y-3 mt-4'>
          <Input placeholder='Data' type='date' value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
          <Input placeholder='Objeção' value={formData.main_objection} onChange={(e) => setFormData({...formData, main_objection: e.target.value})} />
          <Button onClick={() => submit()} disabled={isPending}>{isPending ? 'Salvando...' : 'Salvar'}</Button>
        </div>
      )}
    </div>
  )
}