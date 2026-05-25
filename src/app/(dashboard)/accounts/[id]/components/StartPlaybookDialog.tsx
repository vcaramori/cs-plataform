'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { PlayCircle } from "lucide-react"
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { instantiatePlaybook } from '@/app/(dashboard)/playbooks/actions'

export function StartPlaybookDialog({ accountId, accountName }: { accountId: string, accountName: string }) {
  const [open, setOpen] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    if (open) {
      loadTemplates()
    }
  }, [open])

  async function loadTemplates() {
    const { data } = await supabase
      .from('playbook_templates')
      .select('id, name, description')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    
    if (data) setTemplates(data)
  }

  const handleStartPlaybook = async () => {
    if (!selectedTemplate) return
    
    setIsLoading(true)
    try {
      const res = await instantiatePlaybook(accountId, selectedTemplate)
      if (res.success) {
        setOpen(false)
        router.refresh()
        // Optional: redirect to playbook execution
        // router.push(`/playbooks/execution/${res.instanceId}`)
      } else {
        alert("Erro ao iniciar playbook: " + res.error)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="w-full py-3.5 rounded-xl border border-border-divider bg-surface-background hover:bg-surface-card text-content-secondary hover:text-content-primary transition-all text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 group">
          <PlayCircle className="w-4 h-4 text-indigo-600 dark:text-primary shrink-0 group-hover:scale-110 transition-transform" />
          Iniciar Novo Playbook
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-2xl bg-surface-card border-border-divider shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-sm font-black uppercase tracking-widest text-content-primary">
            Instanciar Playbook
          </DialogTitle>
          <DialogDescription className="text-[10px] text-content-secondary uppercase tracking-wider mt-1 select-none opacity-60">
            Selecione o playbook para iniciar em {accountName}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {templates.length === 0 ? (
            <div className="text-sm text-center text-muted-foreground">Nenhum template ativo encontrado.</div>
          ) : (
            <div className="space-y-2">
              {templates.map(template => (
                <div 
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  className={`p-3 border rounded-xl cursor-pointer transition-colors ${
                    selectedTemplate === template.id 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:bg-accent/50'
                  }`}
                >
                  <div className="font-semibold text-sm">{template.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{template.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isLoading}>Cancelar</Button>
          <Button 
            onClick={handleStartPlaybook} 
            disabled={!selectedTemplate || isLoading}
            className="bg-primary text-primary-foreground"
          >
            {isLoading ? 'Iniciando...' : 'Iniciar Playbook'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
