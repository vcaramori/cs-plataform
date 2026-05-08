import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import SentimentChart from './sentiment-chart'

export const metadata = {
  title: 'Voice of Customer | CS-Continuum',
  description: 'Análise de sentimentos e temas das interações com clientes',
}

export default async function VoCPage() {
  const supabase = createClient()

  // 1. Fetch sentiment trend (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: interactions } = await supabase
    .from('interactions')
    .select('created_at, sentiment_score')
    .gte('created_at', thirtyDaysAgo.toISOString())
    .not('sentiment_score', 'is', null)

  // Aggregate by day
  const trendData: Record<string, { date: string, score: number, count: number }> = {}
  
  interactions?.forEach(int => {
    const date = new Date(int.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    if (!trendData[date]) {
      trendData[date] = { date, score: 0, count: 0 }
    }
    trendData[date].score += Number(int.sentiment_score)
    trendData[date].count += 1
  })

  const chartData = Object.values(trendData).map(d => ({
    date: d.date,
    score: Number((d.score / d.count).toFixed(2))
  })).sort((a, b) => a.date.localeCompare(b.date))

  // 2. Fetch themes count
  const { data: themes } = await supabase
    .from('interaction_themes')
    .select('theme')
  
  const themeCounts: Record<string, number> = {}
  themes?.forEach(t => {
    themeCounts[t.theme] = (themeCounts[t.theme] || 0) + 1
  })

  const topThemes = Object.entries(themeCounts)
    .map(([theme, count]) => ({ theme, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // 3. Fetch latest interactions with quotes
  const { data: quoteInteractions } = await supabase
    .from('interactions')
    .select(`
      id, 
      description, 
      quotes, 
      created_at, 
      account_id,
      accounts (
        name
      )
    `)
    .not('quotes', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Voice of Customer</h1>
          <p className="text-muted-foreground">
            Análise inteligente de sentimentos e temas das interações.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: Tendência de Sentimento */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Tendência de Sentimento</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {chartData.length > 0 ? (
              <SentimentChart data={chartData} />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Dados insuficientes para gerar o gráfico.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Temas Mais Citados */}
        <Card>
          <CardHeader>
            <CardTitle>Temas Mais Citados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {topThemes.map((t, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="capitalize">{t.theme}</span>
                  <span className="text-muted-foreground">{t.count} citações</span>
                </div>
                <Progress value={(t.count / (themes?.length || 1)) * 100} className="h-2" />
              </div>
            ))}
            {topThemes.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum tema identificado ainda.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section 3: Feed de Quotes */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Feed de Voz do Cliente</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {quoteInteractions?.map((int: any) => (
            <Card key={int.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">{(int.accounts as any)?.name || 'Cliente'}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {new Date(int.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <Badge variant="secondary">Interação</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {int.quotes && int.quotes.map((quote: string, i: number) => (
                    <p key={i} className="text-sm italic text-muted-foreground border-l-2 border-primary/30 pl-3">
                      "{quote}"
                    </p>
                  ))}
                  {(!int.quotes || int.quotes.length === 0) && (
                    <p className="text-sm text-muted-foreground">
                      {int.description?.slice(0, 150)}...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {(!quoteInteractions || quoteInteractions.length === 0) && (
            <p className="text-sm text-muted-foreground col-span-2 text-center py-8">
              Nenhuma citação extraída ainda.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
