'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function VocBoardClient() {
  const { data: sentimentData } = useQuery({
    queryKey: ['voc-sentiment-trends'],
    queryFn: async () => {
      const res = await fetch('/api/voc/sentiment-trends')
      return res.json()
    },
  })

  const { data: themesData } = useQuery({
    queryKey: ['voc-top-themes'],
    queryFn: async () => {
      const res = await fetch('/api/voc/top-themes')
      return res.json()
    },
  })

  const { data: quotesData } = useQuery({
    queryKey: ['voc-quotes'],
    queryFn: async () => {
      const res = await fetch('/api/voc/quotes')
      return res.json()
    },
  })

  return (
    <div className="space-y-6">
      {/* Sentiment Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Tendência de Sentimento (30d)</CardTitle>
        </CardHeader>
        <CardContent>
          {sentimentData?.data ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={sentimentData.data}>
                <defs>
                  <linearGradient id="colorSentiment" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[-1, 1]} />
                <Tooltip />
                <Area type="monotone" dataKey="sentiment" stroke="#3b82f6" fill="url(#colorSentiment)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <Skeleton className="h-80" />
          )}
        </CardContent>
      </Card>

      {/* Top Pains vs Praises */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Top 5 Pains</CardTitle>
          </CardHeader>
          <CardContent>
            {themesData?.pains ? (
              <ul className="space-y-2">
                {themesData.pains.map((p: any, i: number) => (
                  <li key={i} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                    <span className="text-sm">{p.theme}</span>
                    <span className="text-xs font-bold text-slate-500">{p.count}x</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Skeleton className="h-40" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-emerald-600">Top 5 Praises</CardTitle>
          </CardHeader>
          <CardContent>
            {themesData?.praises ? (
              <ul className="space-y-2">
                {themesData.praises.map((p: any, i: number) => (
                  <li key={i} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                    <span className="text-sm">{p.theme}</span>
                    <span className="text-xs font-bold text-slate-500">{p.count}x</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Skeleton className="h-40" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Quotes */}
      <Card>
        <CardHeader>
          <CardTitle>Feedback Highlights</CardTitle>
        </CardHeader>
        <CardContent>
          {quotesData?.quotes ? (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {quotesData.quotes.map((q: any, i: number) => (
                <div key={i} className="p-3 bg-slate-50 rounded border border-slate-200">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{q.sentiment > 0 ? '👍' : q.sentiment < 0 ? '👎' : '💭'}</span>
                    <div className="flex-1">
                      <p className="text-sm text-slate-700">"{q.quote}"</p>
                      <p className="text-xs text-slate-500 mt-2">{new Date(q.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Skeleton className="h-40" />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
