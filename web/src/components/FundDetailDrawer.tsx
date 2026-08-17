import {useEffect, useState} from 'react'
import {Info, LineChart, Loader2, TrendingUp, User, Wallet} from 'lucide-react'
import {fetchFundDetail, type FundDetail} from '@/lib/api'
import {formatPercent, valueTone} from '@/lib/format'
import {formatFundAge} from '@/lib/utils'
import {FundPerformanceChart} from '@/components/FundPerformanceChart'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from '@/components/ui/sheet'

export function FundDetailDrawer({
  code,
  name,
  open,
  onOpenChange,
}: {
  code: string | null
  name?: string
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [detail, setDetail] = useState<FundDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !code) return
    let cancelled = false
    setLoading(true)
    setError('')
    setDetail(null)
    fetchFundDetail(code)
      .then((data) => {
        if (!cancelled) setDetail(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError((err as Error).message || '获取基金详情失败')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, code])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent width="560px">
        <SheetHeader>
          <SheetTitle>
            {detail?.name || name || code || '基金详情'}
          </SheetTitle>
          {detail ? (
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="font-mono text-xs text-muted">{detail.code}</span>
              {detail.ftype ? (
                <span className="sector-tag">{detail.ftype}</span>
              ) : null}
              {detail.indexName ? (
                <span className="sector-tag">跟踪: {detail.indexName}</span>
              ) : null}
              {detail.riskLevel ? (
                <span className="sector-tag">{detail.riskLevel}</span>
              ) : null}
            </div>
          ) : null}
        </SheetHeader>

        <SheetBody>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted" />
              <span className="ml-2 text-sm text-muted">加载基金详情…</span>
            </div>
          ) : error ? (
            <div className="error-banner m-2">{error}</div>
          ) : detail ? (
            <div className="py-2">
              {/* 基本信息 */}
              <section className="detail-section">
                <h3 className="detail-section-title flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5" />
                  基本信息
                </h3>
                <div className="detail-info-grid">
                  <InfoItem
                    label="基金规模"
                    value={
                      detail.fundScale
                        ? `${detail.fundScale.value.toFixed(2)}${detail.fundScale.unit}元`
                        : '--'
                    }
                  />
                  <InfoItem
                    label="成立日期"
                    value={detail.establishDate ? detail.establishDate.slice(0, 10) : '--'}
                  />
                  <InfoItem
                    label="成立时长"
                    value={formatFundAge(detail.establishDate) || '--'}
                  />
                  <InfoItem label="基金公司" value={detail.fundCompany || '--'} />
                  <InfoItem label="托管银行" value={detail.custodianBank || '--'} />
                  <InfoItem label="风险等级" value={detail.riskLevel || '--'} />
                </div>
                {detail.benchmark ? (
                  <div className="detail-info-item mt-3">
                    <span className="detail-info-label">业绩比较基准</span>
                    <span className="detail-info-value text-xs leading-relaxed">
                      {detail.benchmark}
                    </span>
                  </div>
                ) : null}
              </section>

              {/* 基金经理 */}
              <section className="detail-section">
                <h3 className="detail-section-title flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  基金经理
                </h3>
                {detail.managers.length ? (
                  <div className="space-y-2">
                    {detail.managers.map((mgr, i) => (
                      <div key={i} className="manager-card">
                        <div className="manager-avatar">
                          {mgr.name ? mgr.name.charAt(0) : '?'}
                        </div>
                        <div className="manager-info">
                          <div className="manager-name">{mgr.name || '--'}</div>
                          <div className="manager-meta">
                            {detail.fundCompany || ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted">暂无基金经理信息</p>
                )}
              </section>

              {/* 费率 */}
              <section className="detail-section">
                <h3 className="detail-section-title flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5" />
                  费率信息
                </h3>
                <div className="detail-info-grid mb-3">
                  <InfoItem label="管理费" value={detail.fees.manageFee || '--'} />
                  <InfoItem label="托管费" value={detail.fees.custodyFee || '--'} />
                  {detail.fees.serviceFee && detail.fees.serviceFee !== '0.00%' ? (
                    <InfoItem label="销售服务费" value={detail.fees.serviceFee} />
                  ) : null}
                  <InfoItem
                    label="申购费率"
                    value={
                      detail.fees.purchaseRate
                        ? `${detail.fees.purchaseRate}${detail.fees.originalPurchaseRate && detail.fees.originalPurchaseRate !== detail.fees.purchaseRate ? ` (原${detail.fees.originalPurchaseRate})` : ''}`
                        : '--'
                    }
                  />
                  <InfoItem label="申购状态" value={detail.fees.purchaseStatus || '--'} />
                  <InfoItem label="赎回状态" value={detail.fees.redemptionStatus || '--'} />
                  {detail.fees.minPurchase ? (
                    <InfoItem label="最低申购金额" value={`${detail.fees.minPurchase}元`} />
                  ) : null}
                  {detail.fees.minRedemption ? (
                    <InfoItem label="最小赎回份额" value={detail.fees.minRedemption} />
                  ) : null}
                  {detail.fees.buyConfirmDay ? (
                    <InfoItem label="买入确认日" value={detail.fees.buyConfirmDay} />
                  ) : null}
                  {detail.fees.sellConfirmDay ? (
                    <InfoItem label="卖出确认日" value={detail.fees.sellConfirmDay} />
                  ) : null}
                </div>
                {/* 赎回费率分档表 */}
                {detail.fees.redemptionRates.length > 0 ? (
                  <div className="mb-3">
                    <div className="text-xs font-medium text-ink-soft mb-1.5">赎回费率（按持有期限）</div>
                    <table className="holding-detail-table">
                      <thead>
                        <tr>
                          <th>持有期限</th>
                          <th className="text-right">赎回费率</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.fees.redemptionRates.map((tier, i) => {
                          const isFree = /^0(\.0+)?%$/.test(tier.rate)
                          const isHigh = parseFloat(tier.rate) >= 1
                          return (
                            <tr key={i}>
                              <td className="text-ink">{tier.holdingPeriod}</td>
                              <td
                                className={`text-right font-mono tabular-nums ${
                                  isFree ? 'fall' : isHigh ? 'rise' : ''
                                }`}
                              >
                                {tier.rate}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : null}
                {/* 申购费率分档表 */}
                {detail.fees.purchaseRates.length > 0 ? (
                  <div className="mb-3">
                    <div className="text-xs font-medium text-ink-soft mb-1.5">申购费率（按金额）</div>
                    <table className="holding-detail-table">
                      <thead>
                        <tr>
                          <th>适用金额</th>
                          <th className="text-right">费率</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.fees.purchaseRates.map((tier, i) => (
                          <tr key={i}>
                            <td className="text-ink">{tier.amountRange}</td>
                            <td className="text-right font-mono tabular-nums text-ink-soft">
                              {tier.rate}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </section>

              {/* 前十大持仓 */}
              <section className="detail-section">
                <h3 className="detail-section-title flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  前十大持仓
                </h3>
                {detail.holdings.length ? (
                  <>
                    <table className="holding-detail-table">
                      <thead>
                        <tr>
                          <th>股票名称</th>
                          <th className="text-right">持仓占比</th>
                          <th className="text-right">最新价</th>
                          <th className="text-right">涨跌幅</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.holdings.map((stock) => (
                          <tr key={stock.code}>
                            <td>
                              <div className="text-ink">{stock.name || stock.shortName || '--'}</div>
                              <div className="font-mono text-[10px] text-muted">{stock.code}</div>
                            </td>
                            <td className="text-right font-mono tabular-nums text-ink-soft">
                              {stock.holdingWeight != null
                                ? `${stock.holdingWeight.toFixed(2)}%`
                                : '--'}
                            </td>
                            <td className="text-right font-mono tabular-nums">
                              {stock.price != null ? stock.price.toFixed(2) : '--'}
                            </td>
                            <td className={`text-right font-mono tabular-nums ${valueTone(stock.percent)}`}>
                              {stock.percent != null ? formatPercent(stock.percent) : '--'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="mt-2 text-[10px] text-muted">
                      持仓数据来源于最新季报，行情为实时数据
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-muted">暂无持仓数据</p>
                )}
              </section>

              {/* 业绩走势 */}
              <section className="detail-section">
                <h3 className="detail-section-title flex items-center gap-1.5">
                  <LineChart className="h-3.5 w-3.5" />
                  业绩走势
                </h3>
                <FundPerformanceChart
                  code={detail?.code || code}
                  name={detail?.name || name}
                  open={open}
                />
              </section>

              {/* 投资目标与策略 */}
              {detail.investTarget || detail.investStrategy ? (
                <section className="detail-section">
                  <h3 className="detail-section-title">投资目标与策略</h3>
                  {detail.investTarget ? (
                    <div className="detail-info-item mb-2">
                      <span className="detail-info-label">投资目标</span>
                      <span className="text-xs leading-relaxed text-ink-soft block mt-1">
                        {detail.investTarget}
                      </span>
                    </div>
                  ) : null}
                  {detail.investStrategy ? (
                    <div className="detail-info-item">
                      <span className="detail-info-label">投资策略</span>
                      <span className="text-xs leading-relaxed text-ink-soft block mt-1">
                        {detail.investStrategy.length > 200
                          ? `${detail.investStrategy.slice(0, 200)}…`
                          : detail.investStrategy}
                      </span>
                    </div>
                  ) : null}
                </section>
              ) : null}
            </div>
          ) : null}
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}

function InfoItem({label, value}: {label: string; value: string}) {
  return (
    <div className="detail-info-item">
      <span className="detail-info-label">{label}</span>
      <span className="detail-info-value">{value}</span>
    </div>
  )
}
