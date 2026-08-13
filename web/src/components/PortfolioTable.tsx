import {useState} from 'react'
import {ChevronDown, ChevronRight, Pencil, Plus, Trash2} from 'lucide-react'
import {
  createHolding,
  removeHolding,
  updateHolding,
  moveHolding,
  type FundQuoteRow,
  type HoldingInput,
  type MultiPortfolioPayload,
  type Portfolio,
  type PortfolioResult,
} from '@/lib/api'
import {formatCurrency, formatPercent, valueTone} from '@/lib/format'
import {shouldShowIntradayEstimate} from '@/lib/tradingCalendar'
import {Button} from '@/components/ui/button'
import {Panel, PanelHeader} from '@/components/ui/panel'
import {FundFormDialog} from '@/components/FundFormDialog'
import {FundTrendDialog} from '@/components/FundTrendDialog'

export function PortfolioTable({
  data,
  loading,
  activePortfolioId,
  portfolios,
  onChanged,
}: {
  data: MultiPortfolioPayload | null
  loading: boolean
  activePortfolioId: string | null
  portfolios: Portfolio[]
  onChanged: () => void
}) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<FundQuoteRow | null>(null)
  const [trendRow, setTrendRow] = useState<FundQuoteRow | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const defaultPortfolioId = activePortfolioId || portfolios[0]?.id || ''

  function toggleCollapse(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function submit(payload: HoldingInput) {
    if (editing) {
      await updateHolding(editing.id, {
        totalCost: payload.totalCost,
        amount: payload.amount,
        amountBasis: payload.amountBasis,
      })
    } else {
      await createHolding(payload)
    }
    onChanged()
  }

  function handleDelete(row: FundQuoteRow) {
    if (!window.confirm(`确认删除 ${row.name}（${row.code}）？`)) return
    removeHolding(row.id)
    onChanged()
  }

  function handleMove(row: FundQuoteRow, targetPortfolioId: string) {
    moveHolding(row.id, targetPortfolioId)
    onChanged()
  }

  const portfolioResults = data?.portfolios || []
  const aggregateList = data?.aggregate?.list || []

  // Determine which portfolios to show
  const visiblePortfolios: PortfolioResult[] =
    activePortfolioId === null
      ? portfolioResults.filter((r) => r.list.length > 0)
      : portfolioResults.filter((r) => r.portfolioId === activePortfolioId)

  const showGrouped = activePortfolioId === null && visiblePortfolios.length > 0
  const singleList = activePortfolioId !== null ? visiblePortfolios[0]?.list || [] : []

  return (
    <section id="funds" className="scroll-mt-20" aria-labelledby="funds-title">
      <Panel>
        <PanelHeader
          title="持仓基金"
          desc={showGrouped ? '按组合分组 · 点击折叠/展开' : '累计持仓与当日收益'}
          titleId="funds-title"
          action={
            <Button
              size="sm"
              onClick={() => {
                setEditing(null)
                setOpen(true)
              }}
            >
              <Plus className="h-4 w-4" />
              添加持仓
            </Button>
          }
        />

        {loading && !data ? (
          <div className="p-4">
            {Array.from({length: 4}).map((_, index) => (
              <div key={index} className="mb-2 h-12 animate-pulse rounded-lg bg-paper-deep" />
            ))}
          </div>
        ) : showGrouped ? (
          /* Grouped view: one section per portfolio */
          <div className="divide-y divide-line/40">
            {visiblePortfolios.map((pr) => {
              const isCollapsed = collapsed.has(pr.portfolioId)
              return (
                <div key={pr.portfolioId} className="px-3 sm:px-5">
                  <button
                    type="button"
                    onClick={() => toggleCollapse(pr.portfolioId)}
                    className="flex w-full items-center gap-2 py-2.5 text-left"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4 text-muted" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted" />
                    )}
                    <span className="font-display text-base font-semibold text-ink">
                      {pr.portfolioName}
                    </span>
                    <span className="text-xs text-muted">({pr.list.length}只)</span>
                    <span className="ml-auto flex items-center gap-3 text-xs">
                      <span className="text-muted">
                        市值{' '}
                        <span className="font-mono text-ink">
                          {formatCurrency(pr.summary.totalCurrentValue)}
                        </span>
                      </span>
                      <span className={`font-mono ${valueTone(pr.summary.dayPnl)}`}>
                        {pr.summary.dayPnl == null
                          ? '-'
                          : formatCurrency(pr.summary.dayPnl, {signed: true})}
                      </span>
                      <span className={`font-mono ${valueTone(pr.summary.floatingPnl)}`}>
                        {pr.summary.floatingPnl == null
                          ? '-'
                          : formatCurrency(pr.summary.floatingPnl, {signed: true})}
                      </span>
                    </span>
                  </button>
                  {!isCollapsed ? (
                    <HoldingsTable
                      rows={pr.list}
                      portfolios={portfolios}
                      currentPortfolioId={pr.portfolioId}
                      onEdit={(row) => {
                        setEditing(row)
                        setOpen(true)
                      }}
                      onDelete={handleDelete}
                      onMove={handleMove}
                      onTrend={setTrendRow}
                    />
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : singleList.length > 0 ? (
          /* Single portfolio view */
          <div className="portfolio-table-wrap">
            <HoldingsTable
              rows={singleList}
              portfolios={portfolios}
              currentPortfolioId={activePortfolioId || ''}
              onEdit={(row) => {
                setEditing(row)
                setOpen(true)
              }}
              onDelete={handleDelete}
              onMove={handleMove}
              onTrend={setTrendRow}
            />
          </div>
        ) : (
          /* Empty state */
          <div className="py-16 text-center">
            <div className="font-display text-xl text-ink">
              {activePortfolioId ? '该组合暂无持仓' : '还没有基金持仓'}
            </div>
            <p className="mt-2 text-sm text-muted">添加基金后即可开始计算。</p>
          </div>
        )}

        <FundFormDialog
          open={open}
          onOpenChange={setOpen}
          initial={editing}
          onSubmit={submit}
          portfolios={portfolios}
          defaultPortfolioId={defaultPortfolioId}
        />
        {trendRow ? (
          <FundTrendDialog
            open
            onOpenChange={(value) => {
              if (!value) setTrendRow(null)
            }}
            code={trendRow.code}
            name={trendRow.name}
            badgePercent={trendRow.estimateGrowth ?? trendRow.percent}
            intradayPoints={(trendRow.trend || [])
              .filter((point) => point.growth != null)
              .map((point) => ({time: point.time, value: point.growth as number}))}
          />
        ) : null}
      </Panel>
    </section>
  )
}

/* ---------- Sub-component: Holdings Table ---------- */

function HoldingsTable({
  rows,
  portfolios,
  currentPortfolioId,
  onEdit,
  onDelete,
  onMove,
  onTrend,
}: {
  rows: FundQuoteRow[]
  portfolios: Portfolio[]
  currentPortfolioId: string
  onEdit: (row: FundQuoteRow) => void
  onDelete: (row: FundQuoteRow) => void
  onMove: (row: FundQuoteRow, targetPortfolioId: string) => void
  onTrend: (row: FundQuoteRow) => void
}) {
  const otherPortfolios = portfolios.filter((p) => p.id !== currentPortfolioId)

  return (
    <div className="portfolio-table-wrap">
      <table className="portfolio-table">
        <thead>
          <tr>
            <th>名称</th>
            <th className="text-right">持仓成本</th>
            <th className="text-right">当前市值</th>
            <th className="text-right">持仓收益率</th>
            <th className="text-right">资产占比</th>
            <th>板块</th>
            <th className="text-right">实时收益</th>
            <th className="text-right">当日预估涨跌</th>
            <th className="text-right">预估回本还需上涨</th>
            <th className="text-center">操作</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <button
                  type="button"
                  className="max-w-full text-left font-medium text-ink underline decoration-line underline-offset-4 transition-colors hover:text-accent"
                  title={`查看 ${row.name} 走势`}
                  onClick={() => onTrend(row)}
                >
                  {row.name}
                </button>
                <div className="mt-1 flex items-center gap-2 font-mono text-xs text-muted">
                  <span>{row.code}</span>
                  {row.netValueDate ? <span>净值 {row.netValueDate.slice(5)}</span> : null}
                </div>
                {row.quoteError ? (
                  <div className="mt-1 text-xs text-rise">行情暂不可用</div>
                ) : null}
              </td>
              <NumericCell value={row.totalCost} type="currency" />
              <NumericCell value={row.currentValue} type="currency" />
              <NumericCell value={row.holdingReturnPct} type="percent" tone />
              <NumericCell value={row.weight} type="weight" />
              <td>
                <SectorTags sectors={row.sectors} />
              </td>
              <NumericCell
                value={row.dayPnl}
                type="signed-currency"
                tone
                emptyText="-"
              />
              <NumericCell
                value={
                  shouldShowIntradayEstimate(row) ? row.estimateGrowth : null
                }
                type="percent"
                tone
                emptyText="-"
              />
              <RecoveryCell value={row.estimatedRecoveryPct} />
              <td>
                <div className="flex items-center justify-center gap-1">
                  {otherPortfolios.length > 0 ? (
                    <select
                      className="rounded border border-line bg-paper px-1 py-0.5 text-xs text-muted outline-none hover:text-ink"
                      value=""
                      onChange={(e) => {
                        if (e.target.value) onMove(row, e.target.value)
                      }}
                      title="移动到其他组合"
                    >
                      <option value="">移动</option>
                      {otherPortfolios.map((p) => (
                        <option key={p.id} value={p.id}>
                          → {p.name}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`编辑 ${row.name}`}
                    onClick={() => onEdit(row)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`删除 ${row.name}`}
                    onClick={() => onDelete(row)}
                  >
                    <Trash2 className="h-4 w-4 text-rise" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RecoveryCell({value}: {value: number | null | undefined}) {
  const text = value == null ? '--' : value === 0 ? '已回本' : formatPercent(value)
  return <td className="text-right font-mono tabular-nums text-ink">{text}</td>
}

function NumericCell({
  value,
  type,
  tone,
  emptyText,
}: {
  value: number | null | undefined
  type: 'currency' | 'signed-currency' | 'percent' | 'weight'
  tone?: boolean
  emptyText?: string
}) {
  const missing = value == null || !Number.isFinite(value)
  const text = missing && emptyText != null
    ? emptyText
    : type === 'currency'
      ? formatCurrency(value)
      : type === 'signed-currency'
        ? formatCurrency(value, {signed: true})
        : formatPercent(value, type === 'weight' ? 1 : 2, type !== 'weight')
  return (
    <td className={`text-right font-mono tabular-nums ${tone ? valueTone(value) : ''}`}>
      {text}
    </td>
  )
}

function SectorTags({sectors}: {sectors: string[]}) {
  if (!sectors.length) return <span className="text-xs text-muted">--</span>
  return (
    <div className="flex max-w-[190px] flex-wrap gap-1">
      {sectors.map((sector) => (
        <span key={sector} className="sector-tag">
          {sector}
        </span>
      ))}
    </div>
  )
}
