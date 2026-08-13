import type {HoldingsSummary} from '@/lib/api'
import {formatCurrency, formatPercent, valueTone} from '@/lib/format'

export type PortfolioSummaryInfo = {
  portfolioId: string
  portfolioName: string
  summary: HoldingsSummary
  weight: number | null
}

export function PortfolioSummaryCard({
  info,
  loading,
}: {
  info: PortfolioSummaryInfo
  loading: boolean
}) {
  const {portfolioName, summary, weight} = info
  const holdingTone = valueTone(summary?.floatingPnl)
  const dayTone = valueTone(summary?.dayPnl)

  return (
    <article className="metric-card">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-ink">{portfolioName}</span>
        {weight != null ? (
          <span className="rounded-full bg-paper-deep px-2 py-0.5 text-xs text-muted">
            权重 {weight.toFixed(1)}%
          </span>
        ) : null}
      </div>
      <div className="font-mono text-lg font-semibold tabular-nums text-ink">
        {loading && !summary ? '…' : formatCurrency(summary?.totalCurrentValue)}
      </div>
      <div className="mt-1.5 flex items-center gap-3 text-xs">
        <span className="text-muted">
          当日{' '}
          <span className={`font-mono font-semibold ${dayTone}`}>
            {summary?.dayPnl == null
              ? '-'
              : formatCurrency(summary.dayPnl, {signed: true})}
          </span>
          {summary?.dayReturnPct != null ? (
            <span className={`ml-0.5 ${dayTone}`}>
              {formatPercent(summary.dayReturnPct)}
            </span>
          ) : null}
        </span>
      </div>
      <div className="mt-0.5 flex items-center gap-3 text-xs">
        <span className="text-muted">
          持仓{' '}
          <span className={`font-mono font-semibold ${holdingTone}`}>
            {summary?.floatingPnl == null
              ? '-'
              : formatCurrency(summary.floatingPnl, {signed: true})}
          </span>
          {summary?.holdingReturnPct != null ? (
            <span className={`ml-0.5 ${holdingTone}`}>
              {formatPercent(summary.holdingReturnPct)}
            </span>
          ) : null}
        </span>
      </div>
    </article>
  )
}
