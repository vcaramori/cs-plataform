'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { AdoptionForm } from './AdoptionForm'
import { AdoptionAnalytics } from './AdoptionAnalytics'

interface Feature {
  id: string
  name: string
  module: string
}

interface AdoptionRecord {
  id: string
  feature_id: string
  status: 'not_started' | 'partial' | 'in_use' | 'blocked' | 'na'
  observation: string | null
  blocker_category: 'data_integration' | 'product_roadmap' | 'people_process' | 'governance' | 'no_strategic_relevance' | 'other' | null
  blocker_reason: string | null
  action_plan: string | null
  action_owner: string | null
  responsible_id: string | null
  target_date: string | null
  action_status: 'not_started' | 'in_progress' | 'completed' | 'paused'
  priority_level: 'low' | 'medium' | 'high'
  product_features: Feature
}

interface User {
  id: string
  email: string
}

export function AdoptionDetailsModal({ accountId, accountName }: { accountId: string, accountName: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [records, setRecords] = useState<AdoptionRecord[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedRecord, setSelectedRecord] = useState<AdoptionRecord | null>(null)

  useEffect(() => {
    if (open) {
      fetchData()
    }
  }, [open])

  async function fetchData() {
    setLoading(true)
    try {
      const [adoptionRes, usersRes] = await Promise.all([
        fetch(`/api/accounts/${accountId}/adoption`),
        fetch('/api/users')
      ])

      if (adoptionRes.ok) {
        const data = await adoptionRes.json()
        setRecords(Array.isArray(data) ? data : (data.adoption ?? []))
      }
      if (usersRes.ok) {
        const data = await usersRes.json()
        setUsers(data)
      }
    } catch (err) {
      console.error('Error fetching adoption data:', err)
      toast.error('Erro ao carregar dados de adoção')
    } finally {
      setLoading(false)
    }
  }

  async function updateRecord(record: AdoptionRecord) {
    setSaving(record.id)
    try {
      const payload = {
        feature_id: record.feature_id,
        status: record.status,
        observation: record.observation || null,
        blocker_category: record.blocker_category || null,
        blocker_reason: record.blocker_reason || null,
        action_plan: record.action_plan || null,
        action_owner: record.action_owner || null,
        responsible_id: record.responsible_id || null,
        target_date: record.target_date || null,
        action_status: record.action_status,
        priority_level: record.priority_level
      }

      const res = await fetch(`/api/accounts/${accountId}/adoption`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error('Falha ao salvar')
      toast.success(`Adoção de ${record.product_features.name} atualizada`)
      fetchData()
    } catch (err) {
      console.error('Error updating adoption:', err)
      toast.error('Erro ao salvar alterações')
    } finally {
      setSaving(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="bg-surface-background border-border-divider text-content-secondary hover:text-content-primary h-8 w-8 rounded-lg">
          <Settings2 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-surface-card border-border-divider text-content-primary max-w-5xl h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-border-divider">
          <DialogTitle className="text-xl font-heading font-extrabold uppercase tracking-tight flex items-center gap-3">
            Adoção Funcional: <span className="text-plannera-orange">{accountName}</span>
          </DialogTitle>
          <DialogDescription className="text-content-secondary font-medium">
            Gerencie o status real de implementação e uso de cada funcionalidade contratada.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex min-h-0">
          <AdoptionAnalytics
            records={records}
            loading={loading}
            selectedRecord={selectedRecord}
            onSelectRecord={setSelectedRecord}
          />

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <AdoptionForm
              selectedRecord={selectedRecord}
              users={users}
              saving={saving}
              onUpdate={updateRecord}
              onRecordChange={setSelectedRecord}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
