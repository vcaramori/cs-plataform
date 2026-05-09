'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface SentimentItem {
  date: string
  sentiment: number
}

interface ThemeItem {
  theme: string
  count: number
}

interface QuoteItem {
  quote: string
  sentiment: number
  date: string
}

export default function VocBoardClient() {
  const { data: sentimentData } = useQuery<{ data: SentimentItem[] }>({
    queryKey: ['voc-sentiment-trends'],
    queryFn: async () => {
      const res = await fetch('/api/voc/sentiment-trends')
      return res.json()
    },
  })

  const { data: themesData } = useQuery<{ pains: ThemeItem[]; praises: ThemeItem[] }>({
    queryKey: ['voc-top-themes'],
    queryFn: async () => {
      const res = await fetch('/api/voc/top-themes')
      return res.json()
    },
  })

  const { data: quotesData } = useQuery<{ quotes: QuoteItem[] }>({
    queryKey: ['voc-quotes'],
    queryFn: async () => {
      const res = await fetch('/api/voc/quotes')
      return res.json()
    },
  })

  return (
    <div className="space-y-6">
      {/* Sentiment Trend */}
      <Card variant="glass" className="border-border-divider rounded-2xl overflow-hidden shadow-xl bg-surface-card/80 backdrop-blur-xl">
        <CardHeader className="border-b border-border-divider p-6">
          <CardTitle className="text-content-primary text-sm font-extrabold uppercase tracking-widest">Tendência de Sentimento (30d)</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {sentimentData?.data ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={sentimentData.data}>
                <defs>
                  <linearGradient id="colorSentiment" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--plannera-primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--plannera-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={10} />
                <YAxis domain={[-1, 1]} stroke="rgba(255,255,255,0.3)" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--surface-card)', borderColor: 'var(--border-divider)', borderRadius: '1rem' }}
                  labelStyle={{ color: 'var(--content-primary)' }}
                />
                <Area type="monotone" dataKey="sentiment" stroke="var(--plannera-primary)" fill="url(#colorSentiment)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <Skeleton className="h-80 rounded-2xl" />
          )}
        </CardContent>
      </Card>

      {/* Top Pains vs Praises */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card variant="glass" className="border-border-divider rounded-2xl overflow-hidden shadow-xl bg-surface-card/80 backdrop-blur-xl">
          <CardHeader className="border-b border-border-divider p-6">
            <CardTitle className="text-destructive text-sm font-extrabold uppercase tracking-widest">Top 5 Pains</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {themesData?.pains ? (
              <ul className="space-y-2">
                {themesData.pains.map((p: ThemeItem, i: number) => (
                  <li key={i} className="flex justify-between items-center p-3 bg-surface-background rounded-xl border border-border-divider/50 hover:bg-surface-card transition-colors">
                    <span className="text-sm font-medium text-content-primary">{p.theme}</span>
                    <span className="text-xs font-extrabold text-content-secondary tabular-nums">{p.count}x</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Skeleton className="h-40 rounded-2xl" />
            )}
          </CardContent>
        </Card>

        <Card variant="glass" className="border-border-divider rounded-2xl overflow-hidden shadow-xl bg-surface-card/80 backdrop-blur-xl">
          <CardHeader className="border-b border-border-divider p-6">
            <CardTitle className="text-success text-sm font-extrabold uppercase tracking-widest">Top 5 Praises</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {themesData?.praises ? (
              <ul className="space-y-2">
                {themesData.praises.map((p: ThemeItem, i: number) => (
                  <li key={i} className="flex justify-between items-center p-3 bg-surface-background rounded-xl border border-border-divider/50 hover:bg-surface-card transition-colors">
                    <span className="text-sm font-medium text-content-primary">{p.theme}</span>
                    <span className="text-xs font-extrabold text-content-secondary tabular-nums">{p.count}x</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Skeleton className="h-40 rounded-2xl" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Quotes */}
      <Card variant="glass" className="border-border-divider rounded-2xl overflow-hidden shadow-xl bg-surface-card/80 backdrop-blur-xl">
        <CardHeader className="border-b border-border-divider p-6">
          <CardTitle className="text-content-primary text-sm font-extrabold uppercase tracking-widest">Feedback Highlights</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {quotesData?.quotes ? (
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
              {quotesData.quotes.map((q: QuoteItem, i: number) => (
                <div key={i} className="p-4 bg-surface-background rounded-xl border border-border-divider hover:bg-surface-card transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-surface-card border border-border-divider flex items-center justify-center shadow-sm shrink-0">
                      <span className="text-xl">{q.sentiment > 0 ? '👍' : q.sentiment < 0 ? '👎' : '💭'}</span>
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm text-content-primary font-medium leading-relaxed">"{q.quote}"</p>
                      <p className="text-[10px] font-extrabold text-content-secondary uppercase tracking-widest opacity-60">{new Date(q.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Skeleton className="h-40 rounded-2xl" />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
