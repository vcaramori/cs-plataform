'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Plus, Settings2, Loader2, Package } from 'lucide-react'
import { toast } from 'sonner'

interface Product {
  id: string
  name: string
  key: string | null
  color: string | null
  is_active: boolean
}

export function ProductDialog({ product, onSuccess }: { product?: Product; onSuccess?: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(product?.name ?? '')
  const [key, setKey] = useState(product?.key ?? '')
  const [color, setColor] = useState(product?.color ?? '#6366f1')
  const [isActive, setIsActive] = useState(product?.is_active ?? true)
  const router = useRouter()

  async function onSubmit() {
    if (name.trim().length < 2) { toast.error('Nome obrigatório'); return }
    setLoading(true)
    try {
      const url = product ? `/api/product/products/${product.id}` : '/api/product/products'
      const res = await fetch(url, {
        method: product ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), key: key.trim() || null, color, is_active: isActive }),
      })
      if (!res.ok) throw new Error((await res.json())?.error?.toString() || 'Erro ao salvar produto')
      toast.success(product ? 'Produto atualizado!' : 'Produto criado!')
      setOpen(false)
      onSuccess?.()
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {product ? (
          <Button variant="ghost" size="icon" className="text-content-secondary/40 hover:text-plannera-orange">
            <Settings2 className="w-4 h-4" />
          </Button>
        ) : (
          <Button className="gap-2"><Plus className="w-4 h-4" /> Novo Produto</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Package className="w-5 h-5 text-plannera-orange" /> {product ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
          <DialogDescription>Produtos (=squads) agrupam épicos e funcionalidades. Ex.: ABAST, S&OE, S&OP.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: S&OP" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Chave (slug)</Label>
              <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="ex: sop" />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-11 p-1" />
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-surface-background/50 border border-border-divider">
            <Label className="text-xs font-bold uppercase">Ativo</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={onSubmit} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {product ? 'Salvar' : 'Criar'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
