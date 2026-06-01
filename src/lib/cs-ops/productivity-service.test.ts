import { describe, it, expect } from 'vitest'
import { ProductivityService } from './productivity-service'

/**
 * Mock encadeável do client Supabase: qualquer cadeia de
 * .from().select().eq().gte()... resolve para { data: [], error: null, count: 0 }.
 * Permite testar a lógica de cálculo sem banco real.
 */
function makeEmptySupabase() {
  const builder: any = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === 'then') {
          // torna o builder "awaitable"
          return (resolve: any) => resolve({ data: [], error: null, count: 0 })
        }
        // qualquer método (select, eq, gte, in, not, order, single...) retorna o próprio builder
        return () => builder
      },
    },
  )
  return {
    from: () => builder,
    auth: { getUser: async () => ({ data: { user: null } }) },
  } as any
}

describe('ProductivityService.resolvePeriod', () => {
  const ref = new Date('2026-06-15T12:00:00Z')

  // diferença em dias entre duas datas ISO (robusto a fuso)
  const spanDays = (start: string, end: string) =>
    Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000)

  it('semana cobre 6 dias de janela (7 dias inclusivos)', () => {
    const { start, end } = ProductivityService.resolvePeriod('week', ref)
    expect(spanDays(start, end)).toBe(6)
  })

  it('mês cobre 29 dias de janela (30 dias inclusivos)', () => {
    const { start, end } = ProductivityService.resolvePeriod('month', ref)
    expect(spanDays(start, end)).toBe(29)
  })

  it('trimestre cobre 89 dias de janela (90 dias inclusivos)', () => {
    const { start, end } = ProductivityService.resolvePeriod('quarter', ref)
    expect(spanDays(start, end)).toBe(89)
  })

  it('end é sempre uma data ISO yyyy-mm-dd', () => {
    const { end } = ProductivityService.resolvePeriod('week', ref)
    expect(end).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('getPersonProductivity (sem dados)', () => {
  it('retorna defaults seguros e indicadores nulos quando não há dados', async () => {
    const svc = new ProductivityService(makeEmptySupabase())
    const p = await svc.getPersonProductivity('00000000-0000-0000-0000-000000000000', '2026-05-01', '2026-05-31', {
      full_name: 'Fulano',
      avatar_url: null,
    })

    expect(p.csmName).toBe('Fulano')
    // carga / esforço zerados
    expect(p.load.accountsManaged).toBe(0)
    expect(p.load.utilizationPct).toBe(0)
    expect(p.load.workloadStatus).toBe('underutilized')
    expect(p.effort.hoursTotal).toBe(0)
    expect(p.effort.billablePct).toBe(0)
    expect(p.effort.coveragePct).toBe(0)
    // throughput / suporte sem fonte => null (não chumbado)
    expect(p.throughput.onTimePct).toBeNull()
    expect(p.throughput.avgCycleTimeDays).toBeNull()
    expect(p.support.avgFirstResponseHours).toBeNull()
    expect(p.support.slaCompliancePct).toBeNull()
    expect(p.support.avgCsat).toBeNull()
    expect(p.outcomes.avgNps).toBeNull()
    // score é número 0-100 e burnout não disparado
    expect(p.productivityScore).toBeGreaterThanOrEqual(0)
    expect(p.productivityScore).toBeLessThanOrEqual(100)
    expect(p.burnout.flagged).toBe(false)
    expect(p.burnout.indicators).toEqual([])
  })
})

describe('getTeamProductivity (time vazio)', () => {
  it('time sem pessoas => teamSize 0 e people vazio', async () => {
    const svc = new ProductivityService(makeEmptySupabase())
    const team = await svc.getTeamProductivity('month', '2026-05-01', '2026-05-31')
    expect(team.teamSize).toBe(0)
    expect(team.people).toEqual([])
    expect(team.totals.hoursTotal).toBe(0)
    expect(team.averages.avgCsat).toBeNull()
  })
})
