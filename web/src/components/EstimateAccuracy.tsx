import {useEffect, useState} from 'react'
import {RefreshCw, Target} from 'lucide-react'
import {
  fetchEstimateAccuracy,
  triggerEstimateComparison,
  type AccuracyPayload,
  type AccuracyRecord,
} from '@/lib/api'
import {formatPercent} from '@/lib/format'
import {listFunds, listWatchFunds} from '@/lib/portfolioStore'
import {Panel, PanelHeader} from '@/components/ui/panel'

function isIndexFund(ftype: string) {
  return /指数/.test(ftype)
}

function getThreshold(ftype: string) {
  return isIndexFund(ftype) ? 0.2 : 0.5
}

function formatNav(v: number | null) {
  if (v == null || !Number.isFinite(v)) return '--'
  return v.toFixed(4)
}

function recordStatus(
  record: AccuracyRecord,
  ftype: string,
): {label: string; tone: string} {
  if (record.error == null) {
    if (record.estimateNav != null && record.actualNav == null) {
      return {label: '待净值', tone: 'text-muted'}
    }
    if (record.estimateNav == null && record.actualNav != null) {
      return {label: '无估值', tone: 'text-muted'}
    }
    return {label: '无数据', tone: 'text-muted'}
  }
  const threshold = getThreshold(ftype)
  if (record.accurate) {
    return {label: `准确 ≤${threshold}%`, tone: 'text-fall'}
  }
  return {label: `偏差 >${threshold}%`, tone: 'text-rise'}
}

function errorTone(error: number | null) {
  if (error == null || !Number.isFinite(error)) return 'text-muted'
  return error <= 0.3 ? 'text-fall' : error <= 1 ? 'text-ink' : 'text-rise'
}

/**
 * 统计基金近10个交易日中超限（accurate===false）的次数
 * 只统计有 error 值的记录（对比已完成），取最近10条
 */
function getExceedInfo(
  code: string,
  data: AccuracyPayload['records'],
): {count: number; total: number} {
  const fund = data[code]
  if (!fund) return {count: 0, total: 0}
  const completed = fund.records.filter((r) => r.error != null)
  const recent = completed.slice(-10)
  const count = recent.filter((r) => r.accurate === false).length
  return {count, total: recent.length}
}

/** 超限次数配色：0-1次绿色，2-3次默认色，4次及以上红色 */
function exceedTone(count: number) {
  if (count <= 1) return 'text-fall'
  if (count <= 3) return 'text-ink'
  return 'text-rise'
}

/** 涨跌幅配色：涨=红(text-rise) 跌=绿(text-fall) 平=灰(text-muted) */
function growthTone(v: number | null) {
  if (v == null || !Number.isFinite(v)) return 'text-muted'
  if (v > 0) return 'text-rise'
  if (v < 0) return 'text-fall'
  return 'text-muted'
}

function formatGrowth(v: number | null) {
  if (v == null || !Number.isFinite(v)) return '--'
  const prefix = v > 0 ? '+' : ''
  return `${prefix}${v.toFixed(2)}%`
}

/**
 * 从所有基金记录中提取对比已完成的记录（error != null）
 * 只展示有完整对比结果的记录，当天的未完成估值不会出现。
 * 按日期倒序排列，取最近 50 条。
 */
function flattenRecords(
  data: AccuracyPayload['records'],
  limit = 50,
): Array<{code: string; name: string; ftype: string} & AccuracyRecord> {
  const rows: Array<{code: string; name: string; ftype: string} & AccuracyRecord> = []
  for (const [code, fund] of Object.entries(data)) {
    for (const record of fund.records) {
      // 只保留对比已完成的记录（有 error 值）
      if (record.error != null) {
        rows.push({code, name: fund.name, ftype: fund.ftype, ...record})
      }
    }
  }
  rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  return rows.slice(0, limit)
}

export function EstimateAccuracy({loading}: {loading: boolean}) {
  const [data, setData] = useState<AccuracyPayload | null>(null)
  const [error, setError] = useState('')
  const [comparing, setComparing] = useState(false)

  async function loadData() {
    try {
      const codes = [
        ...listFunds().map((f) => f.code),
        ...listWatchFunds().map((f) => f.code),
      ]
      const result = await fetchEstimateAccuracy(codes)
      setData(result)
      setError('')
    } catch (e) {
      setError((e as Error).message || '加载失败')
    }
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const codes = [
          ...listFunds().map((f) => f.code),
          ...listWatchFunds().map((f) => f.code),
        ]
        const result = await fetchEstimateAccuracy(codes)
        if (!cancelled) {
          setData(result)
          setError('')
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message || '加载失败')
      }
    }
    void load()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load()
    }, 60_000)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void load()
    })
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  async function handleCompare() {
    setComparing(true)
    try {
      await triggerEstimateComparison()
      await loadData()
    } catch (e) {
      setError((e as Error).message || '对比失败')
    } finally {
      setComparing(false)
    }
  }

  const summary = data?.summary
  const rows = data ? flattenRecords(data.records) : []

  // 预计算每只基金近10个交易日的超限次数
  const exceedMap: Record<string, {count: number; total: number}> = {}
  if (data) {
    for (const code of Object.keys(data.records)) {
      exceedMap[code] = getExceedInfo(code, data.records)
    }
  }

  return (
    <div id="accuracy">
      <Panel>
        <PanelHeader
          title="估值准确率"
          desc="盘中估值与实际净值对比 · 指数基金阈值 0.2% / 其他基金 0.5%"
          action={
            <div className="flex items-center gap-4 text-sm">
              {summary ? (
                <>
                  {summary.date && (
                    <span className="rounded bg-paper-deep px-2 py-0.5 text-xs text-muted">
                      {summary.date}
                    </span>
                  )}
                  <span className="text-muted">
                    准确率{' '}
                    <span
                      className={
                        summary.accuracyRate >= 80
                          ? 'font-semibold text-fall'
                          : 'font-semibold text-rise'
                      }
                    >
                      {summary.accuracyRate.toFixed(1)}%
                    </span>
                  </span>
                  <span className="text-muted">
                    平均误差{' '}
                    <span className="font-semibold text-ink">
                      {summary.avgError.toFixed(3)}%
                    </span>
                  </span>
                </>
              ) : null}
              <button
                type="button"
                onClick={() => void handleCompare()}
                disabled={comparing}
                className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-xs text-ink-soft transition hover:bg-paper-deep disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${comparing ? 'animate-spin' : ''}`} />
                {comparing ? '对比中' : '立即对比'}
              </button>
            </div>
          }
        />

        {loading && !data ? (
          <div className="px-4 py-8 text-center text-sm text-muted">加载中…</div>
        ) : error ? (
          <div className="px-4 py-8 text-center text-sm text-rise">{error}</div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted">
            <Target className="mx-auto mb-2 h-8 w-8 opacity-30" />
            暂无已完成的对比数据。盘中打开看板时会自动采集估值，
            每交易日 22:00 自动拉取净值并对比，对比完成后结果才会显示。
            也可点击「立即对比」手动触发。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line/70 text-xs text-muted">
                  <th className="px-3 py-2 text-left font-medium sm:px-5">日期</th>
                  <th className="px-3 py-2 text-left font-medium">基金</th>
                  <th className="px-3 py-2 text-left font-medium">类型</th>
                  <th className="px-3 py-2 text-right font-medium">估值</th>
                  <th className="px-3 py-2 text-right font-medium">预估涨跌幅</th>
                  <th className="px-3 py-2 text-right font-medium">实际净值</th>
                  <th className="px-3 py-2 text-right font-medium">实际涨跌幅</th>
                  <th className="px-3 py-2 text-right font-medium">误差</th>
                  <th className="px-3 py-2 text-center font-medium sm:pr-5">判定</th>
                  <th className="px-3 py-2 text-right font-medium">超限次数</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const status = recordStatus(row, row.ftype)
                  return (
                    <tr
                      key={`${row.code}-${row.date}-${i}`}
                      className="border-b border-line/40 hover:bg-paper-deep/50"
                    >
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-muted sm:px-5">
                        {row.date}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span className="font-medium text-ink">{row.name}</span>
                        <span className="ml-1 text-xs text-muted">{row.code}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-muted">
                        {row.ftype || '--'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-xs">
                        {formatNav(row.estimateNav)}
                      </td>
                      <td className={`whitespace-nowrap px-3 py-2 text-right font-mono text-xs ${growthTone(row.estimateGrowth)}`}>
                        {formatGrowth(row.estimateGrowth)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-xs">
                        {formatNav(row.actualNav)}
                      </td>
                      <td className={`whitespace-nowrap px-3 py-2 text-right font-mono text-xs ${growthTone(row.actualGrowth)}`}>
                        {formatGrowth(row.actualGrowth)}
                      </td>
                      <td
                        className={`whitespace-nowrap px-3 py-2 text-right font-mono text-xs ${errorTone(row.error)}`}
                      >
                        {row.error != null ? `${row.error.toFixed(3)}%` : '--'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-center text-xs sm:pr-5">
                        <span className={status.tone}>{status.label}</span>
                      </td>
                      {(() => {
                        const exceed = exceedMap[row.code] || {count: 0, total: 0}
                        return (
                          <td className={`whitespace-nowrap px-3 py-2 text-right font-mono text-xs ${exceedTone(exceed.count)}`}>
                            {exceed.total > 0 ? `${exceed.count}/${exceed.total}` : '--'}
                          </td>
                        )
                      })()}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}
