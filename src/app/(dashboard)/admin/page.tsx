import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseServerClient, getUserProfile } from '@/lib/supabase/server'
import { PageContainer } from '@/components/ui/page-container'
import { Settings, Zap, ArrowRight, SlidersHorizontal } from 'lucide-react'

export default async function AdminPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const profile = await getUserProfile(user.id)

  if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
    redirect('/dashboard')
  }

  const sections = [
    {
      href: '/admin/integrations',
      title: 'Integrações',
      description: 'CRM, Support, BI, Webhooks e conectores externos',
      icon: Zap,
      color: 'from-orange-500/10 to-orange-500/5',
      accentColor: 'text-orange-600 dark:text-orange-400'
    },
    {
      href: '/admin/settings',
      title: 'Configurações do Sistema',
      description: 'Health score, SLA, NPS, alertas, IA, playbooks e segurança',
      icon: SlidersHorizontal,
      color: 'from-purple-500/10 to-purple-500/5',
      accentColor: 'text-purple-600 dark:text-purple-400'
    },
  ]

  return (
    <PageContainer className="max-w-[1400px] space-y-10">
      {/* Header */}
      <div className="flex flex-col gap-2 relative">
        <div className="absolute -left-12 top-0 w-24 h-24 bg-primary/10 blur-[60px] rounded-full pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-card border border-border-divider flex items-center justify-center shadow-sm">
            <Settings className="w-5 h-5 text-content-primary" />
          </div>
          <h1 className="h1-page">Admin Panel</h1>
        </div>
        <p className="label-premium">Gerenciamento centralizado de configurações do sistema</p>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <Link
              key={section.href}
              href={section.href}
              className="group relative"
            >
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${section.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              <div className="relative h-full p-6 bg-surface-card border border-border-divider rounded-2xl shadow-sm hover:shadow-lg hover:border-border-divider/80 transition-all duration-300">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className={`w-10 h-10 rounded-lg bg-surface-background flex items-center justify-center mb-4 ${section.accentColor}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-content-primary group-hover:text-plannera-orange transition-colors">
                      {section.title}
                    </h3>
                    <p className="text-sm text-content-secondary mt-2">
                      {section.description}
                    </p>
                  </div>
                  <div className="ml-4 text-border-divider group-hover:text-plannera-orange transition-colors opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-1 transition-all duration-300">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </PageContainer>
  )
}
