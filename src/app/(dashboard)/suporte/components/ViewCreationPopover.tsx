'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  List,
  AlertCircle,
  User,
  CheckCircle,
  Star,
  Clock,
  Zap,
  Filter,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

const viewSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  icon: z.enum(['list', 'alert', 'user', 'checkmark', 'star', 'clock', 'zap', 'filter']),
  visibility: z.enum(['personal', 'team']),
})

type ViewFormData = z.infer<typeof viewSchema>

const ICON_OPTIONS = [
  { id: 'list', label: 'Lista', icon: List },
  { id: 'alert', label: 'Alerta', icon: AlertCircle },
  { id: 'user', label: 'Usuário', icon: User },
  { id: 'checkmark', label: 'Concluído', icon: CheckCircle },
  { id: 'star', label: 'Favorito', icon: Star },
  { id: 'clock', label: 'Relógio', icon: Clock },
  { id: 'zap', label: 'Zap', icon: Zap },
  { id: 'filter', label: 'Filtro', icon: Filter },
] as const

interface ViewCreationPopoverProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}

export function ViewCreationPopover({
  open: controlledOpen,
  onOpenChange,
  children,
}: ViewCreationPopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  const { register, handleSubmit, watch, formState: { errors }, reset } = useForm<ViewFormData>({
    resolver: zodResolver(viewSchema),
    defaultValues: {
      name: '',
      icon: 'list',
      visibility: 'personal',
    },
  })

  const selectedIcon = watch('icon')

  const onSubmit = async (data: ViewFormData) => {
    setLoading(true)
    try {
      const response = await fetch('/api/saved-views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          icon: data.icon,
          visibility: data.visibility,
          entity_type: 'support_ticket',
          filters: { operator: 'AND', conditions: [] },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (response.status === 400) {
          toast.error('Uma view com este nome já existe')
        } else {
          toast.error(errorData.error || 'Erro ao criar view')
        }
        return
      }

      toast.success('View criada com sucesso')
      reset()
      setOpen(false)
      router.refresh()
    } catch (err) {
      console.error('Failed to create view:', err)
      toast.error('Erro ao criar view')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {children && <PopoverTrigger asChild>{children}</PopoverTrigger>}
      <PopoverContent className="w-80 p-6 bg-white dark:bg-[#101623] border border-border/50 shadow-2xl rounded-2xl" align="start">
        <div className="space-y-4">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-content-primary mb-5 border-b border-border/50 pb-2">
              Nova view
            </h3>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Icon Selector */}
            <div>
              <Label className="text-[9px] font-black uppercase tracking-widest text-content-secondary/60 mb-3 block ml-1">
                Ícone
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {ICON_OPTIONS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      const input = document.querySelector(
                        `input[value="${id}"]`
                      ) as HTMLInputElement | null
                      if (input) {
                        input.checked = true
                        input.dispatchEvent(new Event('change', { bubbles: true }))
                      }
                    }}
                    className={cn(
                      "p-3 rounded-xl transition-all flex items-center justify-center border",
                      selectedIcon === id
                        ? "bg-plannera-primary text-white border-transparent shadow-lg"
                        : "bg-slate-500/5 border-border/40 text-content-secondary hover:bg-slate-500/10"
                    )}
                    title={label}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
              <div className="hidden">
                {ICON_OPTIONS.map(({ id }) => (
                  <input
                    key={id}
                    type="radio"
                    value={id}
                    {...register('icon')}
                  />
                ))}
              </div>
            </div>

            {/* Name Input */}
            <div>
              <Label htmlFor="name" className="text-[9px] font-black uppercase tracking-widest text-content-secondary/60 mb-2 block ml-1">
                Nome da View
              </Label>
              <Input
                id="name"
                placeholder="Ex: TICKETS CRÍTICOS"
                {...register('name')}
                className="h-10 bg-slate-500/5 dark:bg-slate-400/10 border-border/50 text-foreground rounded-xl text-[10px] font-black uppercase tracking-widest"
              />
              {errors.name && (
                <p className="text-[10px] text-red-600 mt-1">{errors.name.message}</p>
              )}
            </div>

            {/* Visibility Radio Group */}
            <div>
              <Label className="text-[9px] font-black uppercase tracking-widest text-content-secondary/60 mb-3 block ml-1">
                Visibilidade
              </Label>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="personal"
                    {...register('visibility')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-content-primary">Pessoal</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="team"
                    {...register('visibility')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-content-primary">Time</span>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-plannera-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-plannera-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar view'
              )}
            </Button>
          </form>
        </div>
      </PopoverContent>
    </Popover>
  )
}
