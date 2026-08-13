import {useCallback, useEffect, useState} from 'react'
import {BarChart3, Database, Eye, LineChart, RefreshCw, TableProperties, Target, WalletCards} from 'lucide-react'
import {
  fetchHoldings,
  fetchIndices,
  fetchMarketOverview,
  fetchWatchlist,
  type IndexItem,
  type MarketOverviewPayload,
  type MultiPortfolioPayload,
  type Portfolio,
  type WatchQuoteRow,
} from '@/lib/api'
import {
  getActivePortfolioId,
  setActivePortfolioId,
  listPortfolios,
} from '@/lib/portfolioStore'
import {Button} from '@/components/ui/button'
import {ConfigDialog} from '@/components/ConfigDialog'
import {EstimateAccuracy} from '@/components/EstimateAccuracy'
import {IndicesDashboard} from '@/components/IndicesDashboard'
import {MarketOverview} from '@/components/MarketOverview'
import {Overview} from '@/components/Overview'
import {PortfolioTable} from '@/components/PortfolioTable'
import {PortfolioTabBar} from '@/components/PortfolioTabBar'
import {PortfolioManagerDialog} from '@/components/PortfolioManagerDialog'
import {Watchlist} from '@/components/Watchlist'
import packageInfo from '../package.json'
import './index.css'

const REFRESH_MS = 30_000
const SECTIONS = [
  {id: 'overview', label: '总览', icon: WalletCards},
  {id: 'funds', label: '持仓基金', icon: TableProperties},
  {id: 'watchlist', label: '自选基金', icon: Eye},
  {id: 'accuracy', label: '估值准确率', icon: Target},
  {id: 'market', label: 'A股大盘', icon: BarChart3},
  {id: 'indices', label: '指数看板', icon: LineChart},
] as const

export default function App() {
  const [holdings, setHoldings] = useState<MultiPortfolioPayload | null>(null)
  const [indices, setIndices] = useState<IndexItem[]>([])
  const [market, setMarket] = useState<MarketOverviewPayload | null>(null)
  const [watchlist, setWatchlist] = useState<WatchQuoteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [updatedAt, setUpdatedAt] = useState('')
  const [holdingsError, setHoldingsError] = useState('')
  const [indicesError, setIndicesError] = useState('')
  const [marketError, setMarketError] = useState('')
  const [watchlistError, setWatchlistError] = useState('')
  const [configOpen, setConfigOpen] = useState(false)
  const [portfolioManagerOpen, setPortfolioManagerOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<(typeof SECTIONS)[number]['id']>(
    'overview',
  )
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [activePortfolioId, setActivePortfolioIdState] = useState<string | null>(null)

  // Initialize portfolios and active portfolio from localStorage
  useEffect(() => {
    setPortfolios(listPortfolios())
    setActivePortfolioIdState(getActivePortfolioId())
  }, [])

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    const results = await Promise.allSettled([
      fetchHoldings(),
      fetchIndices(),
      fetchMarketOverview(),
      fetchWatchlist(),
    ])
    const [holdingResult, indexResult, marketResult, watchlistResult] = results

    if (holdingResult.status === 'fulfilled') {
      setHoldings(holdingResult.value)
      setHoldingsError('')
    } else {
      setHoldingsError(readError(holdingResult.reason, '基金行情加载失败'))
    }

    if (indexResult.status === 'fulfilled') {
      setIndices(indexResult.value)
      setIndicesError('')
    } else {
      setIndicesError(readError(indexResult.reason, '指数行情加载失败'))
    }

    if (marketResult.status === 'fulfilled') {
      setMarket(marketResult.value)
      setMarketError('')
    } else {
      setMarketError(readError(marketResult.reason, 'A股大盘加载失败'))
    }

    if (watchlistResult.status === 'fulfilled') {
      setWatchlist(watchlistResult.value)
      setWatchlistError('')
    } else {
      setWatchlistError(readError(watchlistResult.reason, '自选基金行情加载失败'))
    }

    if (results.some((result) => result.status === 'fulfilled')) {
      setUpdatedAt(new Date().toLocaleTimeString('zh-CN', {hour12: false}))
    }
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load(true)
    }, REFRESH_MS)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void load(true)
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [load])

  useEffect(() => {
    const updateActiveSection = () => {
      let current: (typeof SECTIONS)[number]['id'] = 'overview'
      for (const {id} of SECTIONS) {
        const element = document.getElementById(id)
        if (element && element.getBoundingClientRect().top <= 104) current = id
      }
      setActiveSection(current)
    }
    updateActiveSection()
    window.addEventListener('scroll', updateActiveSection, {passive: true})
    return () => window.removeEventListener('scroll', updateActiveSection)
  }, [])

  function handleSelectPortfolio(id: string | null) {
    setActivePortfolioIdState(id)
    setActivePortfolioId(id)
  }

  function handlePortfoliosChanged() {
    setPortfolios(listPortfolios())
    void load(true)
  }

  const allFailed = !!holdingsError && !!indicesError && !!marketError

  // Determine which summary and portfolio results to show
  const activeResult =
    activePortfolioId !== null
      ? holdings?.portfolios.find((r) => r.portfolioId === activePortfolioId)
      : null
  const displaySummary = activeResult?.summary || holdings?.aggregate?.summary || null
  const portfolioResults = holdings?.portfolios || []
  const totalCurrentValue = holdings?.totalCurrentValue ?? null

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img">
              <path d="M4 19V13M10 19V9M16 19v-4" />
              <path d="m4 9 5-4 4 3 7-6" />
              <path d="M16 2h4v4" />
            </svg>
          </div>
          <div>
            <div className="brand-title-line">
              <div className="font-display text-lg font-semibold text-ink">基金看板</div>
              <span className="version-badge">v{packageInfo.version}</span>
            </div>
            <div className="text-[11px] text-muted">
              {updatedAt ? `更新 ${updatedAt}` : '本地数据看板'}
            </div>
          </div>
        </div>

        <nav className="top-nav" aria-label="页面导航">
          {SECTIONS.map(({id, label, icon: Icon}) => (
            <a
              key={id}
              href={`#${id}`}
              className={`nav-link ${activeSection === id ? 'active' : ''}`}
              onClick={() => setActiveSection(id)}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </a>
          ))}
        </nav>

        <div className="top-actions">
          <Button type="button" variant="outline" onClick={() => setConfigOpen(true)}>
            <Database className="h-4 w-4" />
            导入 / 导出
          </Button>
          <Button type="button" onClick={() => void load(true)} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? '刷新中' : '刷新'}
          </Button>
        </div>
      </header>

      <div className="main-column">
        <main className="page-content">
          {allFailed ? (
            <div className="error-banner" role="alert">
              行情加载失败，请确认网络连接或稍后重试。本地持仓数据未受影响。
            </div>
          ) : null}
          {holdingsError && !allFailed ? (
            <div className="error-banner" role="status">{holdingsError}</div>
          ) : null}

          {/* Portfolio tab bar */}
          {portfolios.length > 0 ? (
            <PortfolioTabBar
              portfolios={portfolios}
              activeId={activePortfolioId}
              onSelect={handleSelectPortfolio}
              onManage={() => setPortfolioManagerOpen(true)}
            />
          ) : null}

          <Overview
            summary={displaySummary}
            loading={loading}
            portfolioResults={portfolioResults}
            totalCurrentValue={totalCurrentValue}
            activePortfolioId={activePortfolioId}
          />
          <PortfolioTable
            data={holdings}
            loading={loading}
            activePortfolioId={activePortfolioId}
            portfolios={portfolios}
            onChanged={() => void load(true)}
          />
          <Watchlist
            rows={watchlist}
            loading={loading}
            error={watchlistError}
            onChanged={() => void load(true)}
          />
          <EstimateAccuracy loading={loading} />
          <MarketOverview data={market} loading={loading} error={marketError} />
          <IndicesDashboard
            items={indices}
            loading={loading}
            error={indicesError}
          />

          <footer className="pb-4 text-center text-xs leading-6 text-muted">
            数据仅供参考，不构成投资建议；请以基金公司、交易所及正规行情商披露为准。
          </footer>
        </main>
      </div>

      <ConfigDialog
        open={configOpen}
        onOpenChange={setConfigOpen}
        onImported={() => {
          setPortfolios(listPortfolios())
          void load(true)
        }}
      />
      <PortfolioManagerDialog
        open={portfolioManagerOpen}
        onOpenChange={setPortfolioManagerOpen}
        onChanged={handlePortfoliosChanged}
      />
    </div>
  )
}

function readError(error: unknown, fallback: string) {
  return (
    (error as {response?: {data?: {message?: string}}})?.response?.data?.message ||
    (error as Error)?.message ||
    fallback
  )
}
