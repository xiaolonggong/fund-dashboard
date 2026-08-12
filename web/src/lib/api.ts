import axios from 'axios'
import {calcHoldings} from '@/lib/holdingsCalc'
import {sharesFromAmount} from '@/lib/money'
import {
  createFund as createLocalFund,
  createWatchFund as createLocalWatchFund,
  importLocalConfig,
  listFunds,
  listWatchFunds,
  loadConfig,
  patchFunds,
  patchWatchFunds,
  removeFund as removeLocalFund,
  removeWatchFund as removeLocalWatchFund,
  updateFund as updateLocalFund,
} from '@/lib/portfolioStore'

export const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {'Cache-Control': 'no-cache', Pragma: 'no-cache'},
})

api.interceptors.request.use((config) => {
  if ((config.method || 'get').toLowerCase() === 'get') {
    config.params = {...(config.params || {}), _t: Date.now()}
  }
  return config
})

export type FundRecord = {
  code: string
  name: string
  fundKey?: string
  shares: number
  totalCost: number
  sectors: string[]
  createdAt?: string
  updatedAt?: string
}

export type WatchFundRecord = {
  code: string
  name: string
  fundKey?: string
  sectors: string[]
  createdAt?: string
  updatedAt?: string
}

export type WatchQuoteRow = WatchFundRecord & {
  percent: number | null
  percentSource?: 'estimate' | 'confirmed' | null
  estimateGrowth?: number | null
  trend: {time: string; growth: number | null; netValue?: number | null}[]
  netValueDate?: string
  error?: string
}

export type FundQuoteRow = FundRecord & {
  percent: number | null
  percentSource?: 'estimate' | 'confirmed' | null
  estimateGrowth?: number | null
  dayGrowth?: number | null
  netValueDate?: string
  netValue?: number | null
  estimateNetValue?: number | null
  prevNetValue?: number | null
  time?: string | null
  trend: {time: string; growth: number | null; netValue?: number | null}[]
  currentValue: number | null
  settledValue: number | null
  dayPnl: number | null
  holdingPnl: number | null
  holdingReturnPct: number | null
  estimatedRecoveryPct: number | null
  weight: number | null
  quoteError?: string
}

export type HoldingsSummary = {
  totalCurrentValue: number | null
  totalCost: number
  floatingPnl: number | null
  holdingReturnPct: number | null
  dayPnl: number | null
  dayReturnPct: number | null
  recoveryPct: number | null
  missingCount: number
}

export type HoldingsPayload = {
  summary: HoldingsSummary
  list: FundQuoteRow[]
}

export type IndexGroup = 'A股' | '港股' | '美股' | '日韩'

export type IndexItem = {
  code: string
  name: string
  group: IndexGroup
  percent: number | null
  price?: number | null
  change?: number | null
  open?: number | null
  high?: number | null
  low?: number | null
  previousClose?: number | null
  volume?: number | null
  amount?: number | null
  updatedAt?: string | null
}

export type AppSettings = Record<string, never>

export type AppConfig = {
  schemaVersion: number
  exportedAt?: string
  settings: AppSettings
  funds: Record<string, FundRecord>
  watchlist: WatchFundRecord[]
}

function assertOk<T extends {success?: boolean; message?: string}>(data: T): T {
  if (data && data.success === false) throw new Error(data.message || '请求失败')
  return data
}

export async function fetchHoldings(): Promise<HoldingsPayload> {
  const funds = listFunds()
  if (!funds.length) {
    const empty = calcHoldings([], [])
    return {summary: empty.summary, list: empty.list}
  }
  const {data} = await api.post<{
    success: boolean
    message?: string
    data: {quotes: FundQuoteRow[]}
  }>('/funds/quotes', {type: 'hold', funds})
  assertOk(data)
  const result = calcHoldings(funds, data.data.quotes || [])
  if (result.persistPatches.length) patchFunds(result.persistPatches)
  return {summary: result.summary, list: result.list}
}

export async function fetchIndices(): Promise<IndexItem[]> {
  const {data} = await api.get<{success: boolean; message?: string; data: IndexItem[]}>(
    '/indices',
  )
  return assertOk(data).data
}

export type MarketOverviewPayload = {
  upDown: {up: number; down: number; flat: number; time: string | null}
  topGainers: {code: string; name: string; percent: number}[]
  topLosers: {code: string; name: string; percent: number}[]
}

export async function fetchMarketOverview(): Promise<MarketOverviewPayload> {
  const {data} = await api.get<{
    success: boolean
    message?: string
    data: MarketOverviewPayload
  }>('/market/overview')
  return assertOk(data).data
}

export async function fetchWatchlist(): Promise<WatchQuoteRow[]> {
  const funds = listWatchFunds()
  if (!funds.length) return []
  const {data} = await api.post<{
    success: boolean
    message?: string
    data: {quotes: WatchQuoteRow[]}
  }>('/funds/quotes', {type: 'watch', funds})
  assertOk(data)
  const byCode = new Map((data.data.quotes || []).map((quote) => [quote.code, quote]))
  const list = funds.map((fund) => {
    const quote = byCode.get(fund.code)
    return {
      ...fund,
      ...quote,
      code: fund.code,
      name: quote?.name || fund.name,
      fundKey: quote?.fundKey || fund.fundKey,
      sectors: quote?.sectors?.length ? quote.sectors : fund.sectors,
      percent: quote?.percent ?? null,
      estimateGrowth: quote?.estimateGrowth ?? null,
      trend: quote?.trend || [],
    }
  })
  patchWatchFunds(
    list.map((item) => ({
      code: item.code,
      name: item.name,
      fundKey: item.fundKey,
      sectors: item.sectors,
    })),
  )
  return list
}

export type IndexHistoryRange = '1m' | '3m' | '6m' | '1y' | '3y'

export type IndexHistoryPayload = {
  code: string
  name: string
  range: IndexHistoryRange
  periodPercent: number | null
  points: {date: string; close: number; percent: number | null}[]
}

export async function fetchIndexHistory(
  code: string,
  range: IndexHistoryRange = '1m',
) {
  const {data} = await api.get<{
    success: boolean
    message?: string
    data: IndexHistoryPayload
  }>(`/indices/${encodeURIComponent(code)}/history`, {params: {range}})
  return assertOk(data).data
}

export type FundHistoryRange = '3m' | '1y' | '3y' | 'since'

export type FundHistoryPayload = {
  code: string
  range: FundHistoryRange
  periodPercent: number | null
  points: {date: string; netValue: number; percent: number | null}[]
}

export async function fetchFundHistory(code: string, range: FundHistoryRange = '3m') {
  const {data} = await api.get<{
    success: boolean
    message?: string
    data: FundHistoryPayload
  }>(`/funds/${encodeURIComponent(code)}/history`, {params: {range}})
  return assertOk(data).data
}

export type FundQuoteDetail = {
  code: string
  name: string
  establishDate?: string
  ageDays?: number | null
  percent?: number | null
  netValue?: number | null
}

export async function fetchFundQuote(code: string) {
  const {data} = await api.get<{
    success: boolean
    message?: string
    data: FundQuoteDetail
  }>(`/funds/${encodeURIComponent(code)}/quote`)
  return assertOk(data).data
}

export type ResolveFundResult = {
  code: string
  name: string
  fundKey: string
  sectors: string[]
  netValue?: number | null
  prevNetValue?: number | null
  prevNetValueDate?: string
  netValueDate?: string
  confirmedSession?: boolean
}

export async function resolveFund(code: string, type: 'hold' | 'watch' = 'hold') {
  const {data} = await api.post<{
    success: boolean
    message?: string
    data: ResolveFundResult
  }>('/funds/resolve', {code, type})
  return assertOk(data).data
}

export type FundSearchResult = {
  code: string
  name: string
  fundType: string
  shortName: string
}

export async function searchFunds(keyword: string): Promise<FundSearchResult[]> {
  const {data} = await api.get<{
    success: boolean
    message?: string
    data: FundSearchResult[]
  }>('/funds/suggest', {params: {q: keyword}})
  return assertOk(data).data
}

export type AmountBasis = 'prev' | 'today'

export function deriveHoldShares(
  amount: number,
  basis: AmountBasis,
  meta: ResolveFundResult,
): number {
  if (!(amount > 0)) throw new Error('当前持仓金额必须大于 0')
  if (basis === 'today') {
    if (!meta.confirmedSession) {
      throw new Error('今日净值尚未确认，请改选“昨日结算”')
    }
    if (!(meta.netValue != null && meta.netValue > 0)) {
      throw new Error('暂无今日确认净值，请稍后重试')
    }
    return sharesFromAmount(amount, meta.netValue)
  }
  const nav =
    meta.confirmedSession && meta.prevNetValue != null && meta.prevNetValue > 0
      ? meta.prevNetValue
      : meta.netValue
  if (!(nav != null && nav > 0)) {
    throw new Error('暂无确认净值，无法按金额反推份额')
  }
  return sharesFromAmount(amount, nav)
}

export type HoldingInput = {
  code: string
  totalCost: number
  amount: number
  amountBasis: AmountBasis
}

export async function createHolding(payload: HoldingInput) {
  if (!(payload.totalCost >= 0)) throw new Error('持仓成本不能小于 0')
  const meta = await resolveFund(payload.code)
  const shares = deriveHoldShares(payload.amount, payload.amountBasis, meta)
  return createLocalFund({
    code: meta.code,
    name: meta.name,
    fundKey: meta.fundKey,
    shares,
    totalCost: payload.totalCost,
    sectors: meta.sectors || [],
  })
}

export async function updateHolding(code: string, payload: Omit<HoldingInput, 'code'>) {
  if (!(payload.totalCost >= 0)) throw new Error('持仓成本不能小于 0')
  const meta = await resolveFund(code)
  const shares = deriveHoldShares(payload.amount, payload.amountBasis, meta)
  return updateLocalFund(code, {
    shares,
    totalCost: payload.totalCost,
    name: meta.name,
    fundKey: meta.fundKey,
    sectors: meta.sectors || [],
  })
}

export function removeHolding(code: string) {
  removeLocalFund(code)
}

export async function createWatchFund(code: string) {
  const meta = await resolveFund(code, 'watch')
  return createLocalWatchFund({
    code: meta.code,
    name: meta.name,
    fundKey: meta.fundKey,
    sectors: meta.sectors || [],
  })
}

export function removeWatchFund(code: string) {
  removeLocalWatchFund(code)
}

export function exportConfig(): AppConfig {
  return {...loadConfig(), exportedAt: new Date().toISOString()}
}

export function importConfig(payload: unknown): AppConfig {
  return importLocalConfig(payload)
}
