'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SectionHeader } from '@/components/ui/section-header'
import { Loader2, CheckCircle, Save, Mail, Key, Server, Folder, Clock, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'

export function SupportTab() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Campos do formulário
  const [imapHost, setImapHost] = useState('')
  const [imapPort, setImapPort] = useState('993')
  const [imapUser, setImapUser] = useState('')
  const [imapPassword, setImapPassword] = useState('')
  const [imapFolder, setImapFolder] = useState('Helpdesk')

  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState('587')
  const [smtpUser, setSmtpUser] = useState('')
  const [smtpPassword, setSmtpPassword] = useState('')

  const [emailTestRecipient, setEmailTestRecipient] = useState('')
  const [syncIntervalMinutes, setSyncIntervalMinutes] = useState('1')

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/support-settings')
      if (!response.ok) throw new Error('Falha ao carregar configurações de e-mail')
      const data = await response.json()
      
      if (data.settings) {
        const s = data.settings
        setImapHost(s.imap_host || '')
        setImapPort(String(s.imap_port || '993'))
        setImapUser(s.imap_user || '')
        setImapPassword(s.imap_password || '')
        setImapFolder(s.imap_folder || 'Helpdesk')

        setSmtpHost(s.smtp_host || '')
        setSmtpPort(String(s.smtp_port || '587'))
        setSmtpUser(s.smtp_user || '')
        setSmtpPassword(s.smtp_password || '')

        setEmailTestRecipient(s.email_test_recipient || '')
        setSyncIntervalMinutes(String(s.sync_interval_minutes || '1'))
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      toast.error('Erro ao carregar configurações de e-mail')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    try {
      setSaving(true)
      const response = await fetch('/api/admin/support-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            imap_host: imapHost,
            imap_port: parseInt(imapPort) || 993,
            imap_user: imapUser,
            imap_password: imapPassword,
            imap_folder: imapFolder,
            smtp_host: smtpHost,
            smtp_port: parseInt(smtpPort) || 587,
            smtp_user: smtpUser,
            smtp_password: smtpPassword,
            email_test_recipient: emailTestRecipient,
            sync_interval_minutes: parseInt(syncIntervalMinutes) || 1
          }
        })
      })

      if (!response.ok) throw new Error('Falha ao salvar configurações')
      toast.success('Configurações salvas com sucesso!')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Falha ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Integração de E-mail de Suporte (IMAP/SMTP)"
        subtitle="Configure as caixas de correio de entrada e saída utilizadas pela ferramenta de atendimento."
      />

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-plannera-orange" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Seção IMAP e SMTP em grid de 2 colunas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* CARD 1: Configuração IMAP */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="p-6 bg-surface-card border border-border-divider rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center gap-3 border-b border-border-divider pb-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-content-primary">Recebimento de Chamados (IMAP)</h3>
                    <p className="text-[10px] text-content-secondary">Lê mensagens recebidas e cria/atualiza tickets no dashboard</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-content-secondary">IMAP Host</label>
                    <div className="relative">
                      <Server className="absolute left-3 top-2.5 w-3.5 h-3.5 text-content-secondary" />
                      <input
                        type="text"
                        value={imapHost}
                        onChange={e => setImapHost(e.target.value)}
                        placeholder="imap.outlook.com"
                        className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface-background border border-border-divider rounded-xl focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-content-secondary">Porta</label>
                    <input
                      type="number"
                      value={imapPort}
                      onChange={e => setImapPort(e.target.value)}
                      placeholder="993"
                      className="w-full px-3 py-1.5 text-xs bg-surface-background border border-border-divider rounded-xl focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-content-secondary">Usuário IMAP (E-mail)</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-content-secondary" />
                    <input
                      type="email"
                      value={imapUser}
                      onChange={e => setImapUser(e.target.value)}
                      placeholder="suporte@plannera.com.br"
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface-background border border-border-divider rounded-xl focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-content-secondary">Senha / App Password</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-2.5 w-3.5 h-3.5 text-content-secondary" />
                    <input
                      type="password"
                      value={imapPassword}
                      onChange={e => setImapPassword(e.target.value)}
                      placeholder="••••••••••••••••"
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface-background border border-border-divider rounded-xl focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-content-secondary">Pasta da Caixa Postal</label>
                  <div className="relative">
                    <Folder className="absolute left-3 top-2.5 w-3.5 h-3.5 text-content-secondary" />
                    <input
                      type="text"
                      value={imapFolder}
                      onChange={e => setImapFolder(e.target.value)}
                      placeholder="Helpdesk"
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface-background border border-border-divider rounded-xl focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* CARD 2: Configuração SMTP */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
            >
              <Card className="p-6 bg-surface-card border border-border-divider rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center gap-3 border-b border-border-divider pb-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-600">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-content-primary">Envio de Notificações (SMTP)</h3>
                    <p className="text-[10px] text-content-secondary">Envia links de CSAT e alertas aos destinatários</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-content-secondary">SMTP Host</label>
                    <div className="relative">
                      <Server className="absolute left-3 top-2.5 w-3.5 h-3.5 text-content-secondary" />
                      <input
                        type="text"
                        value={smtpHost}
                        onChange={e => setSmtpHost(e.target.value)}
                        placeholder="smtp.office365.com"
                        className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface-background border border-border-divider rounded-xl focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-content-secondary">Porta</label>
                    <input
                      type="number"
                      value={smtpPort}
                      onChange={e => setSmtpPort(e.target.value)}
                      placeholder="587"
                      className="w-full px-3 py-1.5 text-xs bg-surface-background border border-border-divider rounded-xl focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-content-secondary">Usuário SMTP</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-content-secondary" />
                    <input
                      type="email"
                      value={smtpUser}
                      onChange={e => setSmtpUser(e.target.value)}
                      placeholder="suporte@plannera.com.br"
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface-background border border-border-divider rounded-xl focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-content-secondary">Senha SMTP</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-2.5 w-3.5 h-3.5 text-content-secondary" />
                    <input
                      type="password"
                      value={smtpPassword}
                      onChange={e => setSmtpPassword(e.target.value)}
                      placeholder="••••••••••••••••"
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface-background border border-border-divider rounded-xl focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>

          {/* CARD 3: Parâmetros Globais */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card className="p-6 bg-surface-card border border-border-divider rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center gap-3 border-b border-border-divider pb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-content-primary">Parâmetros de Execução & Testes</h3>
                  <p className="text-[10px] text-content-secondary">Controle a frequência da sincronização e overrides de segurança para testes em homologação</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-content-secondary flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                    Override de E-mail de Teste (Segurança)
                  </label>
                  <input
                    type="email"
                    value={emailTestRecipient}
                    onChange={e => setEmailTestRecipient(e.target.value)}
                    placeholder="vinicius.caramori@plannera.com.br"
                    className="w-full px-3 py-1.5 text-xs bg-surface-background border border-border-divider rounded-xl focus:border-primary focus:outline-none font-medium"
                  />
                  <p className="text-[9px] text-content-secondary">
                    * Se preenchido, TODOS os e-mails de saída serão forçados para este endereço, impedindo disparos indesejados para clientes reais.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-content-secondary flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    Intervalo de Execução do Cron (Minutos)
                  </label>
                  <input
                    type="number"
                    value={syncIntervalMinutes}
                    onChange={e => setSyncIntervalMinutes(e.target.value)}
                    placeholder="1"
                    min="1"
                    className="w-full px-3 py-1.5 text-xs bg-surface-background border border-border-divider rounded-xl focus:border-primary focus:outline-none font-medium"
                  />
                  <p className="text-[9px] text-content-secondary">
                    * Determina de quantos em quantos minutos o loop de e-mails deve buscar novas mensagens na pasta IMAP configurada.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Botão de Envio */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={saving}
              className="bg-plannera-orange hover:bg-plannera-orange/90 text-white font-bold rounded-xl px-6 py-2.5 text-xs flex items-center gap-2 shadow-md transition-all hover:scale-[1.02]"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar Configurações
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
