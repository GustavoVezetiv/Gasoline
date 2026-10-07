'use client'

import { priceStats } from '@/lib/pricing'
import type { PriceReport } from '@/lib/types'

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export function PriceHistoryChart({ reports, emptyLabel = 'Ainda não há histórico para este filtro.' }: { reports: PriceReport[]; emptyLabel?: string }) {
  const stats = priceStats(reports)
  if (!stats) return <p className="chart-empty">{emptyLabel}</p>
  const values = reports.map((report) => report.price)
  const low = Math.min(...values)
  const high = Math.max(...values)
  const spread = high - low || 0.1
  const points = reports.map((report, index) => {
    const x = reports.length === 1 ? 50 : 6 + (index / (reports.length - 1)) * 88
    const y = 82 - ((report.price - low) / spread) * 60
    return `${x},${y}`
  }).join(' ')
  const first = new Date(reports[0].created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  const last = new Date(reports[reports.length - 1].created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  return <div className="price-chart">
    <div className="chart-stats">
      <div><span>Atual</span><strong>{money(stats.current)}</strong></div>
      <div><span>Mín.</span><strong>{money(stats.min)}</strong></div>
      <div><span>Máx.</span><strong>{money(stats.max)}</strong></div>
      <div><span>Variação</span><strong className={stats.variation > 0 ? 'up' : stats.variation < 0 ? 'down' : ''}>{stats.variation > 0 ? '+' : ''}{money(stats.variation)}</strong></div>
    </div>
    <svg viewBox="0 0 100 100" role="img" aria-label={`Histórico entre ${money(low)} e ${money(high)}`} preserveAspectRatio="none">
      <line x1="6" x2="94" y1="22" y2="22" />
      <line x1="6" x2="94" y1="52" y2="52" />
      <line x1="6" x2="94" y1="82" y2="82" />
      <polyline points={points} />
      {reports.map((report, index) => {
        const [x, y] = points.split(' ')[index].split(',')
        return <circle key={report.id} cx={x} cy={y} r="1.8"><title>{`${new Date(report.created_at).toLocaleDateString('pt-BR')}: ${money(report.price)}`}</title></circle>
      })}
    </svg>
    <div className="chart-dates"><span>{first}</span><span>{last}</span></div>
  </div>
}
