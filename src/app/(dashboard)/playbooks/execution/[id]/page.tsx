import { getSupabaseServerClient } from '@/lib/supabase/server'
import { PlaybookTimeline } from '../../components/PlaybookTimeline'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, PlayCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default async function PlaybookExecutionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient()

  // Buscar o playbook com as informações do template e da conta
  const { data: playbook, error } = await supabase
    .from('account_playbooks')
    .select(`
      *,
      account:accounts(id, name),
      template:playbook_templates(name, description)
    `)
    .eq('id', id)
    .single()

  if (error || !playbook) {
    notFound()
  }

  // Buscar as tasks
  const { data: tasks } = await supabase
    .from('account_playbook_tasks')
    .select('*, playbook_tasks(is_note_required), profiles!assigned_to(full_name, avatar_url)')
    .eq('account_playbook_id', id)
    .order('created_at', { ascending: true })

  const isCompleted = playbook.status === 'completed'

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex items-center gap-4 text-muted-foreground">
        <Link href={`/accounts/${playbook.account_id}`} className="hover:text-foreground transition-colors flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar para Conta
        </Link>
      </div>

      <div className="bg-surface-background border border-border-divider rounded-2xl p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-primary/10 border border-indigo-100 dark:border-primary/20 shadow-sm">
              <PlayCircle className="w-6 h-6 text-brand-primary dark:text-primary" />
            </div>
            <div>
              <h1 className="h1-page !text-2xl mb-1">{playbook.template?.name || 'Playbook Customizado'}</h1>
              <p className="text-muted-foreground">Executando para <span className="font-bold text-foreground">{playbook.account?.name}</span></p>
            </div>
          </div>
          <Badge variant="neutral" className={isCompleted ? "bg-success/20 text-success" : "bg-primary/20 text-primary"}>
            {isCompleted ? 'Concluído' : 'Em Execução'}
          </Badge>
        </div>
        
        {playbook.template?.description && (
          <p className="mt-4 text-sm text-muted-foreground">{playbook.template.description}</p>
        )}
      </div>

      <div className="pt-4">
        <h2 className="h2-section mb-6">Timeline de Execução</h2>
        <PlaybookTimeline tasks={(tasks || []) as any} playbookId={playbook.id} />
      </div>
    </div>
  )
}
