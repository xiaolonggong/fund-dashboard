import type {HoldingsSummary, PortfolioResult} from '@/lib/api'
import {formatCurrency, formatPercent, valueTone} from '@/lib/format'
import {PortfolioSummaryCard, type PortfolioSummaryInfo} from '@/components/PortfolioSummaryCard'

export function Overview({
  summary,
  loading,
  portfolioResults,
  totalCurrentValue,
  activePortfolioId,
}: {
  summary: HoldingsSummary | null
  loading: boolean
  portfolioResults: PortfolioResult[]
  totalCurrentValue: number | null
  activePortfolioId: string | null
}) {
  const missing = (summary?.missingCount || 0) > 0
  const recovery =
    summary?.recoveryPct == null
      ? '--'
      : summary.recoveryPct === 0
        ? '已回本'
        : `+${summary.recoveryPct.toFixed(2)}%`

  const metrics = [
    {
      label: '持仓总市值',
      value: formatCurrency(summary?.totalCurrentValue),
      tone: 'flat',
    },
    {label: '持仓总成本', value: formatCurrency(summary?.totalCost), tone: 'flat'},
    {
      label: '浮动盈亏',
      value: formatCurrency(summary?.floatingPnl, {signed: true}),
      tone: valueTone(summary?.floatingPnl),
    },
    {
      label: '持仓总收益率',
      value: formatPercent(summary?.holdingReturnPct),
      tone: valueTone(summary?.holdingReturnPct),
    },
    {
      label: '当日收益',
      value:
        summary?.dayPnl == null
          ? '-'
          : formatCurrency(summary.dayPnl, {signed: true}),
      tone: valueTone(summary?.dayPnl),
    },
    {
      label: '当日总收益率',
      value:
        summary?.dayReturnPct == null
          ? '-'
          : formatPercent(summary.dayReturnPct),
      tone: valueTone(summary?.dayReturnPct),
    },
    {
      label: '距离回本还需要上涨',
      value: recovery,
      tone:
        summary?.recoveryPct == null || summary.recoveryPct === 0 ? 'flat' : 'rise',
    },
  ]

  // Build portfolio summary cards for "全部" view
  const portfolioCards: PortfolioSummaryInfo[] = portfolioResults
    .filter((r) => r.list.length > 0 || r.summary.totalCost > 0)
    .map((r) => ({
      portfolioId: r.portfolioId,
      portfolioName: r.portfolioName,
      summary: r.summary,
      weight:
        totalCurrentValue != null && totalCurrentValue > 0 && r.summary.totalCurrentValue != null
          ? (r.summary.totalCurrentValue / totalCurrentValue) * 100
          : null,
    }))

  return (
    <section id="overview" aria-labelledby="overview-title" className="scroll-mt-20">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <p className="section-kicker">Portfolio overview</p>
          <h1 id="overview-title" className="section-title">
            {activePortfolioId ? '组合总览' : '全部组合总览'}
          </h1>
        </div>
        {missing ? (
          <span className="rounded-full bg-brand-soft px-3 py-1 text-xs text-accent">
            部分数据缺失
          </span>
        ) : null}
      </div>
      <div className="metric-grid">
        {metrics.map((metric) => (
          <article key={metric.label} className="metric-card">
            <div className="text-xs text-muted">{metric.label}</div>
            <div className={`mt-2 font-mono text-xl font-semibold tabular-nums ${metric.tone}`}>
              {loading && !summary ? '…' : metric.value}
            </div>
          </article>
        ))}
      </div>

      {/* Portfolio summary cards in "全部" view */}
      {activePortfolioId === null && portfolioCards.length > 0 ? (
        <div className="mt-4">
          <div className="mb-2 text-xs font-medium text-muted">各组合概览</div>
          <div className="metric-grid">
            {portfolioCards.map((card) => (
              <PortfolioSummaryCard key={card.portfolioId} info={card} loading={loading} />
            ))}
          </div>
        </div>
      ) : null}

      <p className="mt-3 text-xs leading-5 text-muted">
        持仓市值、浮动盈亏和持仓收益率仅按已确认净值计算；当日收益按当天预估或当天确认净值计算，盘前及非交易日显示"-"。
      </p>
    </section>
  )
}
