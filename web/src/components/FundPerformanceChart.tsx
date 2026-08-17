import {useEffect, useMemo, useState} from 'react'
import ReactECharts from 'echarts-for-react'
import {fetchFundPerformance, type FundPerformance} from '@/lib/api'
import {toneByDelta} from '@/lib/palette'
import {Button} from '@/components/ui/button'
import {cn} from '@/lib/utils'
import {Loader2} from 'lucide-react'

const RANGE_ORDER = ['1m', '3m', '6m', '1y', '3y', 'ytd', 'all'] as const
type RangeKey = (typeof RANGE_ORDER)[number]

const RANGE_LABELS: Record<RangeKey, string> = {
  '1m': '近1月',
  '3m': '近3月',
  '6m': '近6月',
  '1y': '近1年',
  '3y': '近3年',
  'ytd': '今年来',
  all: '成立来',
}

function pctText(v: number | null) {
  if (v == null) return '--'
  return `${v > 0 ? '+' : ''}${v.toFixed(2)}%`
}

export function FundPerformanceChart({
  code,
  name,
  open,
}: {
  code: string | null
  name?: string
  open: boolean
}) {
  const [perf, setPerf] = useState<FundPerformance | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [range, setRange] = useState<RangeKey>('1y')
  const [chartHeight, setChartHeight] = useState(260)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    const apply = () => setChartHeight(mq.matches ? 300 : 260)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    if (!open || !code) return
    let cancelled = false
    setLoading(true)
    setError('')
    fetchFundPerformance(code)
      .then((data) => {
        if (!cancelled) setPerf(data)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError((e as Error).message || '业绩走势加载失败')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, code])

  const rangeInfo = perf?.ranges?.[range] ?? null
  const startT = rangeInfo && rangeInfo.startDate ? Date.parse(rangeInfo.startDate) : 0

  const {fundData, benchData} = useMemo(() => {
    if (!perf) return {fundData: [] as [number, number][], benchData: [] as [number, number][]}
    const fundSlice = perf.fundSeries.filter((p) => p.t >= startT)
    const benchSlice = perf.benchmarkSeries.filter((p) => p.t >= startT)
    const fundBase = fundSlice[0]?.nav
    const benchBase = benchSlice[0]?.close
    const fd: [number, number][] = fundBase
      ? fundSlice.map((p) => [p.t, Math.round((p.nav / fundBase - 1) * 100 * 100) / 100])
      : []
    const bd: [number, number][] = benchBase
      ? benchSlice.map((p) => [p.t, Math.round((p.close / benchBase - 1) * 100 * 100) / 100])
      : []
    return {fundData: fd, benchData: bd}
  }, [perf, startT])

  const option = useMemo(() => {
    if (!perf || !fundData.length) return null
    const styles = getComputedStyle(document.documentElement)
    const muted = styles.getPropertyValue('--app-muted').trim() || '#6b7785'
    const line = styles.getPropertyValue('--app-line').trim() || '#c8d0d8'
    const benchColor = styles.getPropertyValue('--app-ink-soft').trim() || '#9aa4b0'
    const theme = document.documentElement.dataset.theme

    const fundColor = toneByDelta(rangeInfo?.fundPercent ?? 0, theme)
    const fundName = perf.name || name || '本基金'
    const benchName = perf.benchmarkName || '业绩基准'

    const fundLast = fundData[fundData.length - 1]?.[1] ?? 0
    const benchLast = benchData.length ? (benchData[benchData.length - 1]?.[1] ?? null) : null

    return {
      animation: false,
      grid: {left: 46, right: 64, top: 30, bottom: 28},
      legend: {
        data: benchData.length ? [fundName, benchName] : [fundName],
        top: 0,
        right: 4,
        itemWidth: 14,
        itemHeight: 8,
        textStyle: {color: muted, fontSize: 11},
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(21,32,43,0.92)',
        borderWidth: 0,
        padding: [6, 8],
        textStyle: {color: '#fff', fontSize: 11},
        formatter: (params: unknown) => {
          const list = Array.isArray(params) ? params : [params]
          if (!list.length) return ''
          const p = list[0] as {axisValue?: number}
          const d = p.axisValue ? new Date(p.axisValue) : null
          const dateStr = d
            ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
            : ''
          const lines = list
            .map((s: {seriesName?: string; value?: [number, number] | number}) => {
              const v = Array.isArray(s.value) ? s.value[1] : (s.value as number)
              if (v == null) return ''
              return `${s.seriesName}：<b>${v > 0 ? '+' : ''}${v.toFixed(2)}%</b>`
            })
            .filter(Boolean)
          return [dateStr, ...lines].join('<br/>')
        },
      },
      xAxis: {
        type: 'time',
        boundaryGap: false,
        axisLine: {lineStyle: {color: line}},
        axisTick: {show: false},
        axisLabel: {color: muted, fontSize: 10},
        splitLine: {show: false},
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLine: {show: false},
        axisTick: {show: false},
        splitLine: {lineStyle: {color: line, type: 'dashed'}},
        axisLabel: {
          color: muted,
          fontSize: 10,
          formatter: (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`,
        },
      },
      series: [
        {
          name: fundName,
          type: 'line',
          data: fundData,
          showSymbol: false,
          smooth: 0.2,
          lineStyle: {width: 2, color: fundColor},
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                {offset: 0, color: `${fundColor}33`},
                {offset: 1, color: `${fundColor}00`},
              ],
            },
          },
          endLabel: {
            show: true,
            formatter: `${fundLast > 0 ? '+' : ''}${fundLast.toFixed(2)}%`,
            color: fundColor,
            fontSize: 12,
            fontWeight: 700,
            distance: 8,
          },
        },
        ...(benchData.length
          ? [
              {
                name: benchName,
                type: 'line' as const,
                data: benchData,
                showSymbol: false,
                smooth: 0.2,
                lineStyle: {width: 1.5, color: benchColor, type: 'dashed' as const},
                endLabel: {
                  show: true,
                  formatter: `${benchLast != null && benchLast > 0 ? '+' : ''}${benchLast != null ? benchLast.toFixed(2) : ''}%`,
                  color: benchColor,
                  fontSize: 12,
                  fontWeight: 600,
                  distance: 8,
                },
                markLine: {
                  silent: true,
                  symbol: 'none',
                  lineStyle: {color: muted, type: 'dashed', width: 1},
                  data: [{yAxis: 0}],
                  label: {show: false},
                },
              },
            ]
          : []),
      ],
    }
  }, [perf, fundData, benchData, rangeInfo, name])

  return (
    <div>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible">
        {RANGE_ORDER.map((r) => {
          const info = perf?.ranges?.[r]
          const selected = range === r
          return (
            <Button
              key={r}
              type="button"
              size="sm"
              variant="outline"
              className={cn(
                'h-auto min-h-9 shrink-0 flex-col gap-0.5 px-2.5 py-1.5 text-xs sm:px-3',
                selected
                  ? 'border-ink/40 bg-paper-deep text-ink shadow-[inset_0_0_0_1px_var(--app-ink)] hover:bg-paper-deep'
                  : 'text-ink-soft',
              )}
              onClick={() => setRange(r)}
            >
              <span className={selected ? 'font-semibold text-ink' : undefined}>
                {RANGE_LABELS[r]}
              </span>
              <span
                className={cn(
                  'text-[10px] font-semibold tabular-nums leading-none',
                  !info || info.fundPercent == null
                    ? 'text-muted'
                    : info.fundPercent >= 0
                    ? 'rise'
                    : 'fall',
                )}
              >
                {info ? pctText(info.fundPercent) : ''}
              </span>
            </Button>
          )
        })}
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span className="text-muted">
          业绩基准：
          {perf ? (
            perf.benchmarkIsDefault ? (
              <span className="text-ink-soft">沪深300（默认）</span>
            ) : (
              <span className="text-ink-soft">{perf.benchmarkName}</span>
            )
          ) : (
            '--'
          )}
        </span>
        {rangeInfo && rangeInfo.benchmarkPercent != null ? (
          <span className="text-muted">基准 {pctText(rangeInfo.benchmarkPercent)}</span>
        ) : null}
      </div>

      <div className="mt-1" style={{minHeight: chartHeight}}>
        {loading && !option ? (
          <div
            className="flex items-center justify-center text-sm text-muted"
            style={{height: chartHeight}}
          >
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="ml-2">加载业绩走势…</span>
          </div>
        ) : error && !option ? (
          <div
            className="flex items-center justify-center text-sm text-rise"
            style={{height: chartHeight}}
          >
            {error}
          </div>
        ) : option ? (
          <ReactECharts
            option={option}
            style={{height: chartHeight, width: '100%'}}
            opts={{renderer: 'canvas'}}
            notMerge
          />
        ) : (
          <div
            className="flex items-center justify-center text-sm text-muted"
            style={{height: chartHeight}}
          >
            暂无该周期数据
          </div>
        )}
      </div>
    </div>
  )
}
