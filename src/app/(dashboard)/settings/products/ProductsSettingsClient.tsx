'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageContainer } from '@/components/ui/page-container'
import { SectionHeader } from '@/components/ui/section-header'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, Package, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { ProductDialog } from '../../product/components/ProductDialog'

interface Epic { id: string; name: string; color: string | null; is_active: boolean }
interface Product { id: string; name: string; key: string | null; color: string | null; is_active: boolean; product_epics: Epic[] }

export function ProductsSettingsClient() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [newEpic, setNewEpic] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)

  async function fetchProducts() {
    setLoading(true)
    try {
      const res = await fetch('/api/product/products')
      if (res.ok) setProducts(await res.json())
    } finally { setLoading(false) }
  }
  useEffect(() => { fetchProducts() }, [])

  async function addEpic(productId: string) {
    const name = (newEpic[productId] ?? '').trim()
    if (!name) return
    setBusy(productId)
    try {
      const res = await fetch('/api/product/epics', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, name }),
      })
      if (!res.ok) throw new Error('Erro ao adicionar épico')
      setNewEpic((s) => ({ ...s, [productId]: '' }))
      await fetchProducts()
    } catch (e: any) { toast.error(e.message) } finally { setBusy(null) }
  }

  async function deleteEpic(epicId: string) {
    if (!confirm('Remover este épico?')) return
    const res = await fetch(`/api/product/epics/${epicId}`, { method: 'DELETE' })
    if (res.ok) fetchProducts(); else toast.error('Erro ao remover épico')
  }

  return (
    <PageContainer className="max-w-[1400px] space-y-10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-surface-card border border-border-divider flex items-center justify-center shadow-sm">
          <Package className="w-5 h-5 text-content-primary" />
        </div>
        <div>
          <h1 className="h1-page">Produtos & Épicos</h1>
          <p className="label-premium">Cadastro de produtos (squads) e seus épicos — base do de→para com a RICE</p>
        </div>
      </div>

      <div className="space-y-6">
        <SectionHeader
          title="Produtos"
          subtitle="Cada produto (squad) agrupa épicos; funcionalidades são mapeadas a épicos em Funcionalidades"
          action={<ProductDialog onSuccess={fetchProducts} />}
        />

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-content-secondary" /></div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center bg-surface-card border border-border-divider rounded-2xl">
            <p className="text-content-secondary text-sm">Nenhum produto cadastrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {products.map((p) => (
              <Card key={p.id} className="h-full">
                <CardHeader className="pb-3 border-b border-border-divider">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color ?? '#94a3b8' }} />
                      <CardTitle className="text-sm font-bold uppercase">{p.name}</CardTitle>
                      {p.key && <Badge variant="neutral" className="text-[9px]">{p.key}</Badge>}
                      {!p.is_active && <Badge variant="outline" className="text-[9px]">inativo</Badge>}
                    </div>
                    <ProductDialog product={p} onSuccess={fetchProducts} />
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-content-secondary/60">Épicos ({p.product_epics?.length ?? 0})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(p.product_epics ?? []).map((e) => (
                      <span key={e.id} className="inline-flex items-center gap-1 text-xs bg-surface-background border border-border-divider rounded-full px-2 py-0.5">
                        {e.name}
                        <button onClick={() => deleteEpic(e.id)} className="text-content-secondary/40 hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {(p.product_epics?.length ?? 0) === 0 && <span className="text-xs text-content-secondary/50">Nenhum épico.</span>}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      value={newEpic[p.id] ?? ''}
                      onChange={(ev) => setNewEpic((s) => ({ ...s, [p.id]: ev.target.value }))}
                      onKeyDown={(ev) => { if (ev.key === 'Enter') addEpic(p.id) }}
                      placeholder="Novo épico…"
                      className="h-9"
                    />
                    <Button size="sm" variant="secondary" disabled={busy === p.id} onClick={() => addEpic(p.id)}>
                      {busy === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  )
}
