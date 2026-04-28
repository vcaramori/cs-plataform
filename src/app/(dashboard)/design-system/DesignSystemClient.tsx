'use client'

import { PageContainer } from '@/components/ui/page-container'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Text } from '@/components/ui/typography'
import { 
  Sparkles, Star, Target, Shield, Layout, 
  Palette, Type, Box, MousePointer2, Moon, Sun,
  TrendingUp, AlertTriangle, CheckCircle2, Info
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { ModuleHeader } from '@/components/shared/guardians/ModuleHeader'
import { StatCardPremium } from '@/components/shared/guardians/StatCardPremium'
import { StatusBadgeGuard } from '@/components/shared/guardians/StatusBadgeGuard'

/** 
 * Design System Showcase: "The Guardians"
 * Este componente demonstra a padronização visual do CS-Continuum
 * utilizando a paleta oficial Plannera e o novo Modo Black.
 */

export function DesignSystemClient() {
  const { theme, setTheme } = useTheme()

  return (
    <PageContainer>
      <ModuleHeader 
        title="Os Guardiões" 
        subtitle="Design System & Component Library · Plannera Edition"
        iconName="Shield"
      >
        <Button 
          variant="outline" 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="rounded-2xl h-12 px-6 gap-2 border-border-divider hover:bg-surface-card transition-all"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          Alternar para Modo {theme === 'dark' ? 'Light' : 'Black'}
        </Button>
      </ModuleHeader>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ─── Coluna Esquerda: Fundações ─────────────────────────────────── */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Paleta de Cores */}
          <Card variant="glass" className="rounded-2xl border-border-divider">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-plannera-orange" />
                <CardTitle className="h2-section">Paleta Oficial Plannera</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <ColorBox name="Primary" hex="#2d3558" bg="bg-plannera-primary" />
              <ColorBox name="Plannera" hex="#f7941e" bg="bg-plannera-orange" />
              <ColorBox name="S&OP" hex="#3a4c8a" bg="bg-plannera-sop" />
              <ColorBox name="Operations" hex="#f8b967" bg="bg-plannera-operations" />
              <ColorBox name="Demand" hex="#d85d4b" bg="bg-plannera-demand" />
              <ColorBox name="S&OE" hex="#ea724a" bg="bg-plannera-soe" />
              <ColorBox name="Data Science" hex="#2ba09d" bg="bg-plannera-ds" />
              <ColorBox name="Grey" hex="#5c5b5b" bg="bg-plannera-grey" />
            </CardContent>
          </Card>

          {/* Tipografia */}
          <Card variant="glass" className="rounded-2xl border-border-divider">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-plannera-sop" />
                <CardTitle className="h2-section">Tipografia & Texto</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-1">
                <p className="label-premium">Heading Page (H1)</p>
                <h1 className="h1-page">Dashboard Principal</h1>
              </div>
              <div className="space-y-1">
                <p className="label-premium">Heading Section (H2)</p>
                <h2 className="h2-section">Análise de Performance</h2>
              </div>
              <div className="space-y-1">
                <p className="label-premium">Semantic Text Primitives</p>
                <div className="space-y-2">
                  <Text variant="primary" weight="medium">Texto Primário (Conteúdo Principal)</Text>
                  <Text variant="secondary" size="sm">Texto Secundário (Labels e Apoio)</Text>
                  <Text variant="accent" weight="bold">Texto de Destaque (Call to Action)</Text>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── Coluna Direita: Componentes ────────────────────────────────── */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Botões e Interação */}
          <Card variant="glass" className="rounded-2xl border-border-divider">
            <CardHeader>
              <div className="flex items-center gap-2">
                <MousePointer2 className="w-4 h-4 text-plannera-ds" />
                <CardTitle className="h2-section">Interação & Botões</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <Button size="lg" className="rounded-xl px-8 shadow-lg shadow-plannera-primary/20">Primário (Navy)</Button>
              <Button variant="outline" size="lg" className="rounded-xl px-8 border-border-divider">Contorno</Button>
              <Button variant="premium" size="lg" className="rounded-xl px-8 shadow-lg">Premium Orange</Button>
              <Button variant="ghost" size="lg" className="rounded-xl px-8">Ghost</Button>
            </CardContent>
          </Card>

          {/* Indicadores Semânticos */}
          <Card variant="glass" className="rounded-2xl border-border-divider">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4 text-plannera-soe" />
                <CardTitle className="h2-section">Indicadores & Status</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Badges */}
              <div className="flex flex-wrap gap-3">
                <StatusBadgeGuard icon={CheckCircle2} label="Promotor" type="promoter" />
                <StatusBadgeGuard icon={Info} label="Neutro" type="neutral" />
                <StatusBadgeGuard icon={AlertTriangle} label="Detrator" type="detractor" />
                <StatusBadgeGuard icon={Sparkles} label="IA Insights" type="ai" />
              </div>

              {/* StatCards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatCardPremium 
                  title="NPS Global"
                  value={82}
                  prefix="+"
                  trend={{ value: "12%", isPositive: true }}
                  iconName="TrendingUp"
                  colorVariant="emerald"
                />
                <StatCardPremium 
                  title="Risco de Churn"
                  value={1.2}
                  suffix="M"
                  decimal={1}
                  status="Crítico"
                  iconName="AlertTriangle"
                  colorVariant="demand"
                />
              </div>
            </CardContent>
          </Card>

          {/* Layout & Surfaces */}
          <Card variant="glass" className="rounded-2xl border-border-divider">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Layout className="w-4 h-4 text-plannera-primary" />
                <CardTitle className="h2-section">Superfícies & Profundidade</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <p className="label-premium">Surface Card (Base)</p>
                <div className="h-24 bg-surface-card border border-border-divider rounded-2xl shadow-sm flex items-center justify-center text-[10px] font-bold text-content-secondary uppercase tracking-widest">
                  Card Padrão
                </div>
              </div>
              <div className="space-y-3">
                <p className="label-premium">Surface Background (Canvas)</p>
                <div className="h-24 bg-surface-background border border-border-divider rounded-2xl shadow-inner flex items-center justify-center text-[10px] font-bold text-content-secondary uppercase tracking-widest">
                  Área de Conteúdo
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}

function ColorBox({ name, hex, bg }: { name: string, hex: string, bg: string }) {
  return (
    <div className="space-y-2">
      <div className={cn("h-12 w-full rounded-xl shadow-sm border border-black/5", bg)} />
      <div>
        <p className="text-[10px] font-extrabold text-content-primary uppercase tracking-tight leading-none mb-1">{name}</p>
        <p className="text-[9px] font-bold text-content-secondary tabular-nums opacity-60">{hex}</p>
      </div>
    </div>
  )
}

function StatusBadge({ icon: Icon, label, color }: { icon: any, label: string, color: string }) {
  return (
    <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-extrabold uppercase tracking-widest shadow-sm", color)}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </div>
  )
}
