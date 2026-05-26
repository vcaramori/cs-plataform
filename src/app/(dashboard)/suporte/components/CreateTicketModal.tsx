"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { SearchableSelect } from "@/components/ui/searchable-select"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Mail, Users, CreditCard, Edit3, ShieldAlert } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type AccountOption = {
  id: string
  name: string
}

type Contact = {
  id: string
  name: string
  email: string | null
  role: string | null
}

type CreateTicketModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: AccountOption[]
  onSuccess: (newTicket: any) => void
}

export function CreateTicketModal({
  open,
  onOpenChange,
  accounts,
  onSuccess,
}: CreateTicketModalProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("")
  const [selectedEmails, setSelectedEmails] = useState<string[]>([])
  const [manualEmails, setManualEmails] = useState<string>("")
  const [title, setTitle] = useState<string>("")
  const [description, setDescription] = useState<string>("")
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium")
  const [category, setCategory] = useState<string>("duvida")
  
  // Account details loaded dynamically
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false)
  const [billingEmail, setBillingEmail] = useState<string>("")
  const [contacts, setContacts] = useState<Contact[]>([])

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setSelectedAccountId("")
      setSelectedEmails([])
      setManualEmails("")
      setTitle("")
      setDescription("")
      setPriority("medium")
      setCategory("duvida")
      setBillingEmail("")
      setContacts([])
    }
  }, [open])

  // Load account stakeholders/contacts when account is selected
  useEffect(() => {
    if (!selectedAccountId) {
      setBillingEmail("")
      setContacts([])
      setSelectedEmails([])
      setManualEmails("")
      return
    }

    const loadAccountDetails = async () => {
      setIsLoadingDetails(true)
      try {
        const res = await fetch(`/api/accounts/${selectedAccountId}`)
        if (res.ok) {
          const data = await res.json()
          setBillingEmail(data.billing_contact_email || "")
          setContacts(data.contacts || [])
          
          // Auto select default recipient
          const defaultEmails: string[] = []
          if (data.billing_contact_email) {
            defaultEmails.push(data.billing_contact_email)
          } else if (data.contacts && data.contacts.length > 0 && data.contacts[0].email) {
            defaultEmails.push(data.contacts[0].email)
          }
          setSelectedEmails(defaultEmails)
        } else {
          toast.error("Erro ao carregar contatos da conta.")
        }
      } catch (err) {
        console.error("Failed to load account details:", err)
        toast.error("Erro de conexão ao buscar contatos da conta.")
      } finally {
        setIsLoadingDetails(false)
      }
    }

    loadAccountDetails()
  }, [selectedAccountId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedAccountId) {
      toast.error("Por favor, selecione um cliente.")
      return
    }
    if (!title.trim() || title.length < 3) {
      toast.error("O título deve ter no mínimo 3 caracteres.")
      return
    }
    if (!description.trim() || description.length < 5) {
      toast.error("A descrição deve ter no mínimo 5 caracteres.")
      return
    }

    const manualList = manualEmails.split(/[\s,;]+/).filter(Boolean)
    const invalidEmails = manualList.filter(email => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    if (invalidEmails.length > 0) {
      toast.error(`E-mail(s) manual(is) inválido(s): ${invalidEmails.join(', ')}`)
      return
    }

    const allEmails = Array.from(new Set([...selectedEmails, ...manualList])).filter(Boolean)
    const clientEmailStr = allEmails.join(', ')

    setIsSubmitting(true)
    
    try {
      const payload = {
        account_id: selectedAccountId,
        title,
        description,
        priority,
        category,
        client_email: clientEmailStr || null,
        status: "open",
      }

      const res = await fetch("/api/support-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Erro desconhecido ao criar chamado.")
      }

      const newTicket = await res.json()
      toast.success(
        `Ticket #${newTicket.external_ticket_id || newTicket.id.split("-")[0].toUpperCase()} criado com sucesso!`
      )
      
      if (clientEmailStr) {
        toast.success(`E-mail de confirmação enviado para ${clientEmailStr}`)
      }

      onSuccess(newTicket)
      onOpenChange(false)
    } catch (err: any) {
      toast.error("Erro: " + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-white dark:bg-[#0b0f19] border-border-divider/50 shadow-2xl p-6 sm:rounded-2xl overflow-hidden focus:outline-none z-50">
        <DialogHeader className="border-b border-border-divider/30 pb-4">
          <DialogTitle className="text-sm font-black uppercase tracking-widest text-[#1e293b] dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-plannera-orange" />
            Criar Chamado de Suporte Manual
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="max-h-[75vh] overflow-y-auto pr-2 space-y-5 py-4">
            {/* Cliente/Account Selection */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-[#475569] dark:text-slate-400">
                Cliente (Conta) <span className="text-red-500">*</span>
              </Label>
              <SearchableSelect
                options={accounts.map((acc) => ({ label: acc.name, value: acc.id }))}
                value={selectedAccountId}
                onValueChange={setSelectedAccountId}
                placeholder="Selecione o Cliente..."
                emptyMessage="Nenhum cliente cadastrado."
                size="sm"
              />
            </div>

            {/* Recipient Checkbox Grid and Custom Emails List */}
            {selectedAccountId && (
              <div className="space-y-4 border border-border-divider/40 p-4 rounded-xl bg-slate-50/50 dark:bg-slate-900/10 animate-in fade-in duration-300">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-[#475569] dark:text-slate-400">
                    Notificar Contatos da Conta (Destinatários por E-mail)
                  </Label>
                  {isLoadingDetails ? (
                    <div className="h-9 flex items-center px-3 border border-border-divider/50 rounded-lg bg-surface-card/30 text-xs text-slate-400">
                      <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin text-plannera-orange" />
                      Carregando contatos e stakeholders...
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-40 overflow-y-auto pr-1">
                      {billingEmail && (
                        <div className="flex items-center space-x-2 bg-white dark:bg-slate-900/60 p-2.5 rounded-lg border border-border-divider/60 shadow-sm">
                          <input
                            type="checkbox"
                            id="billing-email-checkbox"
                            checked={selectedEmails.includes(billingEmail)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedEmails([...selectedEmails, billingEmail])
                              } else {
                                setSelectedEmails(selectedEmails.filter(x => x !== billingEmail))
                              }
                            }}
                            className="w-4 h-4 rounded text-plannera-orange focus:ring-plannera-orange/40 cursor-pointer"
                          />
                          <Label htmlFor="billing-email-checkbox" className="text-xs font-medium cursor-pointer flex flex-col gap-0.5">
                            <span className="flex items-center gap-1 font-bold text-[#1e293b] dark:text-white">
                              <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                              Faturamento
                            </span>
                            <span className="text-[10px] text-slate-400">{billingEmail}</span>
                          </Label>
                        </div>
                      )}
                      
                      {contacts.filter(c => c.email).map((c) => (
                        <div key={c.id} className="flex items-center space-x-2 bg-white dark:bg-slate-900/60 p-2.5 rounded-lg border border-border-divider/60 shadow-sm">
                          <input
                            type="checkbox"
                            id={`contact-checkbox-${c.id}`}
                            checked={selectedEmails.includes(c.email!)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedEmails([...selectedEmails, c.email!])
                              } else {
                                setSelectedEmails(selectedEmails.filter(x => x !== c.email))
                              }
                            }}
                            className="w-4 h-4 rounded text-plannera-orange focus:ring-plannera-orange/40 cursor-pointer"
                          />
                          <Label htmlFor={`contact-checkbox-${c.id}`} className="text-xs font-medium cursor-pointer flex flex-col gap-0.5">
                            <span className="flex items-center gap-1 font-bold text-[#1e293b] dark:text-white">
                              <Users className="w-3.5 h-3.5 text-indigo-500" />
                              {c.name} {c.role ? `(${c.role})` : ""}
                            </span>
                            <span className="text-[10px] text-slate-400">{c.email}</span>
                          </Label>
                        </div>
                      ))}

                      {(!billingEmail && contacts.filter(c => c.email).length === 0) && (
                        <div className="col-span-2 text-xs text-slate-400 p-2 italic bg-white dark:bg-slate-900/40 rounded-lg border text-center">
                          Nenhum contato com e-mail cadastrado nesta conta.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-[#475569] dark:text-slate-400">
                    E-mails Adicionais (Separados por vírgula ou ponto e vírgula)
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="exemplo1@cliente.com, exemplo2@cliente.com"
                      value={manualEmails}
                      onChange={(e) => setManualEmails(e.target.value)}
                      className="pl-9 h-9 text-xs border-border-divider/60 rounded-lg focus-visible:ring-1 focus-visible:ring-plannera-orange/40 bg-surface-card/40 dark:bg-slate-900/60 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Title input */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-[#475569] dark:text-slate-400">
                Assunto / Título do Chamado <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                placeholder="Descreva brevemente o problema..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="h-9 text-xs border-border-divider/60 rounded-lg focus-visible:ring-1 focus-visible:ring-plannera-orange/40 bg-surface-card/40 dark:bg-slate-900/60 dark:text-white"
              />
            </div>

            {/* Description input */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-[#475569] dark:text-slate-400">
                Descrição Detalhada <span className="text-red-500">*</span>
              </Label>
              <Textarea
                placeholder="Explique os detalhes do chamado para análise da equipe..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={4}
                className="text-xs border-border-divider/60 rounded-lg focus-visible:ring-1 focus-visible:ring-plannera-orange/40 bg-surface-card/40 dark:bg-slate-900/60 dark:text-white resize-none"
              />
            </div>

            {/* Priority & Category selection grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Priority styled pills selection */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-[#475569] dark:text-slate-400">
                  Prioridade
                </Label>
                <div className="grid grid-cols-4 gap-1.5 bg-slate-50 dark:bg-slate-900/50 p-1 rounded-lg border border-border-divider/40">
                  {(["low", "medium", "high", "critical"] as const).map((p) => {
                    const isActive = priority === p
                    const colorClasses = {
                      low: isActive
                        ? "bg-emerald-500 text-white shadow-sm"
                        : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20",
                      medium: isActive
                        ? "bg-blue-500 text-white shadow-sm"
                        : "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20",
                      high: isActive
                        ? "bg-amber-500 text-white shadow-sm"
                        : "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20",
                      critical: isActive
                        ? "bg-rose-500 text-white shadow-sm"
                        : "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20",
                    }
                    
                    const labelMap = {
                      low: "Baixa",
                      medium: "Média",
                      high: "Alta",
                      critical: "Crítica",
                    }

                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={cn(
                          "py-1.5 text-[10px] font-bold rounded-md uppercase tracking-wider transition-all",
                          colorClasses[p]
                        )}
                      >
                        {labelMap[p]}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Category selection */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-[#475569] dark:text-slate-400">
                  Categoria
                </Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-9 border-border-divider/60 rounded-lg text-xs font-normal normal-case focus:ring-1 focus:ring-plannera-orange/40 bg-surface-card/40 dark:bg-slate-900/60 dark:text-white">
                    <SelectValue placeholder="Selecione a categoria..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#0c101b] border border-border-divider/60 rounded-lg z-[60]">
                    <SelectItem value="acesso" className="text-xs focus:bg-slate-100 dark:focus:bg-slate-800">Acesso / Permissões</SelectItem>
                    <SelectItem value="bug" className="text-xs focus:bg-slate-100 dark:focus:bg-slate-800">Bug / Incidente Técnico</SelectItem>
                    <SelectItem value="financeiro" className="text-xs focus:bg-slate-100 dark:focus:bg-slate-800">Financeiro / Faturamento</SelectItem>
                    <SelectItem value="duvida" className="text-xs focus:bg-slate-100 dark:focus:bg-slate-800">Dúvida Geral</SelectItem>
                    <SelectItem value="outro" className="text-xs focus:bg-slate-100 dark:focus:bg-slate-800">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Action buttons footer */}
          <DialogFooter className="border-t border-border-divider/30 pt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
              className="h-9 border-border-divider/80 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-[10px] font-black uppercase tracking-widest"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-9 bg-plannera-orange hover:bg-plannera-orange/90 text-white rounded-lg px-6 shadow-md shadow-plannera-orange/20 text-[10px] font-black uppercase tracking-widest"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Criar Chamado"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
