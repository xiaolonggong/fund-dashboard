import type {AppConfig, FundRecord, Portfolio, WatchFundRecord} from '@/lib/api'

export const STORAGE_KEY = 'fund-dashboard-config-v2'
const V1_STORAGE_KEY = 'fund-dashboard-config-v1'
const LEGACY_STORAGE_KEY = atob('bGVtby1mdW5kLWNvbmZpZy12MQ==')
export const SCHEMA_VERSION = 2
export const MAX_PORTFOLIOS = 5

function genId(prefix = 'h') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function nowIso() {
  return new Date().toISOString()
}

export const DEFAULT_CONFIG: AppConfig = {
  schemaVersion: SCHEMA_VERSION,
  settings: {},
  portfolios: {},
  funds: {},
  watchlist: [],
  activePortfolioId: null,
}

function cloneDefault(): AppConfig {
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: {},
    portfolios: {},
    funds: {},
    watchlist: [],
    activePortfolioId: null,
  }
}

/** Create the default portfolio for migration */
function makeDefaultPortfolio(): Portfolio {
  return {id: genId('p'), name: '默认组合', createdAt: nowIso()}
}

function normalizeFund(
  raw: Partial<FundRecord> & {code: string},
  prev?: FundRecord,
): FundRecord {
  const code = String(raw.code || '').padStart(6, '0')
  const now = nowIso()
  return {
    id: String(raw.id || prev?.id || genId('h')),
    code,
    name: String(raw.name ?? prev?.name ?? code),
    fundKey: String(raw.fundKey ?? prev?.fundKey ?? ''),
    shares: Number(raw.shares ?? prev?.shares ?? 0) || 0,
    totalCost: Number(raw.totalCost ?? prev?.totalCost ?? 0) || 0,
    sectors: Array.isArray(raw.sectors)
      ? raw.sectors.map(String).filter(Boolean)
      : prev?.sectors || [],
    portfolioId: String(raw.portfolioId ?? prev?.portfolioId ?? ''),
    createdAt: prev?.createdAt || raw.createdAt || now,
    updatedAt: now,
  }
}

function normalizeWatchFund(raw: Partial<WatchFundRecord> & {code: string}): WatchFundRecord {
  const code = String(raw.code || '').padStart(6, '0')
  const now = nowIso()
  return {
    code,
    name: String(raw.name || code),
    fundKey: String(raw.fundKey || ''),
    sectors: Array.isArray(raw.sectors)
      ? raw.sectors.map(String).filter(Boolean)
      : [],
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || now,
  }
}

/**
 * Migrate v1 config (funds keyed by code, no portfolios) to v2
 */
function migrateV1(old: {
  schemaVersion?: number
  funds?: Record<string, any>
  watchlist?: any[]
  settings?: any
}): AppConfig {
  const defaultPortfolio = makeDefaultPortfolio()
  const funds: Record<string, FundRecord> = {}
  const oldFunds = old.funds && typeof old.funds === 'object' ? old.funds : {}
  for (const [key, raw] of Object.entries(oldFunds)) {
    const code = String(raw?.code || key).padStart(6, '0')
    if (!/^\d{6}$/.test(code)) continue
    const normalized = normalizeFund({...raw, code, portfolioId: defaultPortfolio.id})
    if (normalized.shares <= 0 || normalized.totalCost < 0) continue
    funds[normalized.id] = normalized
  }
  const watchlistIn = Array.isArray(old.watchlist) ? old.watchlist : []
  const watchlist: WatchFundRecord[] = []
  const seen = new Set<string>()
  for (const raw of watchlistIn) {
    const code = String(raw?.code || '').padStart(6, '0')
    if (!/^\d{6}$/.test(code) || seen.has(code)) continue
    seen.add(code)
    watchlist.push(normalizeWatchFund({...raw, code}))
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: {},
    portfolios: {[defaultPortfolio.id]: defaultPortfolio},
    funds,
    watchlist,
    activePortfolioId: null,
  }
}

export function normalizeConfig(payload: Partial<AppConfig> | null | undefined): AppConfig {
  // Handle v1 config (migration)
  if (payload && payload.schemaVersion === 1) {
    return migrateV1(payload)
  }

  const portfoliosIn =
    payload?.portfolios && typeof payload.portfolios === 'object' ? payload.portfolios : {}
  const portfolios: Record<string, Portfolio> = {}
  let defaultPortfolioId = ''
  for (const [key, raw] of Object.entries(portfoliosIn)) {
    if (!raw || typeof raw !== 'object') continue
    const id = String(raw.id || key)
    const p: Portfolio = {
      id,
      name: String(raw.name || '未命名组合'),
      createdAt: raw.createdAt || nowIso(),
    }
    portfolios[id] = p
    if (!defaultPortfolioId) defaultPortfolioId = id
  }
  // Ensure at least one portfolio exists
  if (!Object.keys(portfolios).length) {
    const dp = makeDefaultPortfolio()
    portfolios[dp.id] = dp
    defaultPortfolioId = dp.id
  }

  const fundsIn = payload?.funds && typeof payload.funds === 'object' ? payload.funds : {}
  const funds: Record<string, FundRecord> = {}
  for (const [key, raw] of Object.entries(fundsIn)) {
    if (!raw || typeof raw !== 'object') continue
    const code = String(raw.code || '').padStart(6, '0')
    if (!/^\d{6}$/.test(code)) continue
    const portfolioId = String(raw.portfolioId || defaultPortfolioId)
    if (!portfolios[portfolioId]) continue
    const normalized = normalizeFund({...raw, code, portfolioId, id: raw.id || key})
    if (normalized.shares <= 0 || normalized.totalCost < 0) continue
    funds[normalized.id] = normalized
  }

  const watchlistIn = Array.isArray(payload?.watchlist) ? payload.watchlist : []
  const watchlist: WatchFundRecord[] = []
  const seen = new Set<string>()
  for (const raw of watchlistIn) {
    const code = String(raw?.code || '').padStart(6, '0')
    if (!/^\d{6}$/.test(code) || seen.has(code)) continue
    seen.add(code)
    watchlist.push(normalizeWatchFund({...raw, code}))
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    settings: {},
    portfolios,
    funds,
    watchlist,
    activePortfolioId: payload?.activePortfolioId ?? null,
  }
}

export function loadConfig(): AppConfig {
  try {
    const current = localStorage.getItem(STORAGE_KEY)
    if (current) {
      const parsed = JSON.parse(current)
      if (parsed.schemaVersion === SCHEMA_VERSION) {
        return normalizeConfig(parsed)
      }
      // Fall through to migration
    }

    // Try v1 storage
    const v1Raw = current || localStorage.getItem(V1_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY)
    if (v1Raw) {
      const parsed = JSON.parse(v1Raw)
      // Back up old data before migration
      try {
        localStorage.setItem('fund-dashboard-backup-pre-migration', v1Raw)
      } catch { /* ignore */ }
      const migrated = normalizeConfig(parsed)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
      localStorage.removeItem(V1_STORAGE_KEY)
      localStorage.removeItem(LEGACY_STORAGE_KEY)
      return migrated
    }

    return cloneDefault()
  } catch {
    return cloneDefault()
  }
}

export function saveConfig(config: AppConfig): AppConfig {
  const next = normalizeConfig(config)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

/* ---------- Portfolio CRUD ---------- */

export function listPortfolios(): Portfolio[] {
  return Object.values(loadConfig().portfolios).sort(
    (a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''),
  )
}

export function getPortfolio(id: string): Portfolio | null {
  return loadConfig().portfolios[id] || null
}

export function createPortfolio(name: string): Portfolio {
  const config = loadConfig()
  if (Object.keys(config.portfolios).length >= MAX_PORTFOLIOS) {
    throw new Error(`最多创建 ${MAX_PORTFOLIOS} 个组合`)
  }
  const portfolio: Portfolio = {
    id: genId('p'),
    name: name.trim() || `组合${Object.keys(config.portfolios).length + 1}`,
    createdAt: nowIso(),
  }
  config.portfolios[portfolio.id] = portfolio
  saveConfig(config)
  return portfolio
}

export function renamePortfolio(id: string, name: string) {
  const config = loadConfig()
  const portfolio = config.portfolios[id]
  if (!portfolio) throw new Error('组合不存在')
  portfolio.name = name.trim() || portfolio.name
  saveConfig(config)
}

export function deletePortfolio(id: string) {
  const config = loadConfig()
  if (!config.portfolios[id]) throw new Error('组合不存在')
  if (Object.keys(config.portfolios).length <= 1) {
    throw new Error('至少保留一个组合')
  }
  // Delete all holdings in this portfolio
  for (const [hid, fund] of Object.entries(config.funds)) {
    if (fund.portfolioId === id) {
      delete config.funds[hid]
    }
  }
  delete config.portfolios[id]
  if (config.activePortfolioId === id) {
    config.activePortfolioId = null
  }
  saveConfig(config)
}

export function getActivePortfolioId(): string | null {
  return loadConfig().activePortfolioId ?? null
}

export function setActivePortfolioId(id: string | null) {
  const config = loadConfig()
  config.activePortfolioId = id
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

/* ---------- Fund (Holding) CRUD ---------- */

export function listAllFunds(): FundRecord[] {
  return Object.values(loadConfig().funds)
}

export function listFundsByPortfolio(portfolioId: string): FundRecord[] {
  return Object.values(loadConfig().funds).filter((f) => f.portfolioId === portfolioId)
}

/** @deprecated Use listAllFunds or listFundsByPortfolio instead */
export function listFunds(): FundRecord[] {
  return listAllFunds()
}

export function getFund(id: string): FundRecord | null {
  return loadConfig().funds[id] || null
}

export function createFund(payload: Omit<FundRecord, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<FundRecord, 'id' | 'createdAt' | 'updatedAt'>>): FundRecord {
  const config = loadConfig()
  const code = String(payload.code).padStart(6, '0')
  if (!/^\d{6}$/.test(code)) throw new Error('基金代码须为 6 位数字')
  if (!config.portfolios[payload.portfolioId]) {
    throw new Error('所属组合不存在')
  }
  // Check duplicate within same portfolio
  const exists = Object.values(config.funds).some(
    (f) => f.code === code && f.portfolioId === payload.portfolioId,
  )
  if (exists) throw new Error('该基金已在此组合中')
  const next = normalizeFund({...payload, code})
  if (!(next.shares > 0)) throw new Error('持有份额必须大于 0')
  if (next.totalCost < 0) throw new Error('持仓成本不能小于 0')
  config.funds[next.id] = next
  saveConfig(config)
  return next
}

export function updateFund(id: string, patch: Partial<FundRecord>): FundRecord {
  const config = loadConfig()
  const prev = config.funds[id]
  if (!prev) throw new Error('基金不存在')
  const next = normalizeFund({...prev, ...patch, id}, prev)
  if (!(next.shares > 0)) throw new Error('持有份额必须大于 0')
  if (next.totalCost < 0) throw new Error('持仓成本不能小于 0')
  config.funds[id] = next
  saveConfig(config)
  return next
}

export function removeFund(id: string) {
  const config = loadConfig()
  if (!config.funds[id]) throw new Error('基金不存在')
  delete config.funds[id]
  saveConfig(config)
}

export function patchFunds(
  patches: Array<{code: string; name?: string; fundKey?: string; sectors?: string[]}>,
) {
  if (!patches.length) return
  const config = loadConfig()
  let changed = false
  for (const patch of patches) {
    const key = String(patch.code).padStart(6, '0')
    for (const fund of Object.values(config.funds)) {
      if (fund.code !== key) continue
      const next = {...fund}
      if (patch.name && patch.name !== fund.name) {
        next.name = patch.name
        changed = true
      }
      if (patch.fundKey && patch.fundKey !== fund.fundKey) {
        next.fundKey = patch.fundKey
        changed = true
      }
      if (patch.sectors?.length && patch.sectors.join() !== fund.sectors.join()) {
        next.sectors = patch.sectors
        changed = true
      }
      if (changed) config.funds[fund.id] = next
    }
  }
  if (changed) saveConfig(config)
}

/* ---------- Watchlist ---------- */

export function listWatchFunds(): WatchFundRecord[] {
  return loadConfig().watchlist
}

export function createWatchFund(payload: WatchFundRecord): WatchFundRecord {
  const config = loadConfig()
  const code = String(payload.code).padStart(6, '0')
  if (!/^\d{6}$/.test(code)) throw new Error('基金代码须为 6 位数字')
  if (config.watchlist.some((item) => item.code === code)) {
    throw new Error('该基金已在自选列表中')
  }
  const next = normalizeWatchFund({...payload, code})
  config.watchlist.push(next)
  saveConfig(config)
  return next
}

export function removeWatchFund(code: string) {
  const config = loadConfig()
  const key = String(code).padStart(6, '0')
  const index = config.watchlist.findIndex((item) => item.code === key)
  if (index < 0) throw new Error('自选基金不存在')
  config.watchlist.splice(index, 1)
  saveConfig(config)
}

export function patchWatchFunds(
  patches: Array<{code: string; name?: string; fundKey?: string; sectors?: string[]}>,
) {
  if (!patches.length) return
  const config = loadConfig()
  let changed = false
  config.watchlist = config.watchlist.map((item) => {
    const patch = patches.find((entry) => entry.code === item.code)
    if (!patch) return item
    const next = {...item}
    let itemChanged = false
    if (patch.name && patch.name !== item.name) {
      next.name = patch.name
      itemChanged = true
    }
    if (patch.fundKey && patch.fundKey !== item.fundKey) {
      next.fundKey = patch.fundKey
      itemChanged = true
    }
    if (patch.sectors?.length && patch.sectors.join() !== item.sectors.join()) {
      next.sectors = patch.sectors
      itemChanged = true
    }
    if (itemChanged) changed = true
    return itemChanged ? {...next, updatedAt: nowIso()} : item
  })
  if (changed) saveConfig(config)
}

/* ---------- Import / Export ---------- */

function assertImportPayload(payload: unknown): asserts payload is AppConfig {
  if (!payload || typeof payload !== 'object') throw new Error('备份文件不是有效对象')
  const value = payload as Partial<AppConfig>

  // Accept v1 or v2
  if (value.schemaVersion !== 1 && value.schemaVersion !== 2) {
    throw new Error(`不支持的备份版本，仅支持版本 1 或 ${SCHEMA_VERSION}`)
  }

  if (value.funds && typeof value.funds === 'object' && !Array.isArray(value.funds)) {
    for (const [key, raw] of Object.entries(value.funds)) {
      if (!raw || typeof raw !== 'object') throw new Error(`基金 ${key} 的数据无效`)
      const code = String(raw.code || key)
      if (!/^\d{6}$/.test(code)) throw new Error(`基金代码 ${code} 无效`)
      if (!(Number(raw.shares) > 0)) throw new Error(`基金 ${code} 的份额必须大于 0`)
      if (!(Number(raw.totalCost) >= 0)) throw new Error(`基金 ${code} 的持仓成本无效`)
      if (raw.sectors != null && !Array.isArray(raw.sectors)) {
        throw new Error(`基金 ${code} 的板块字段无效`)
      }
    }
  }

  if (value.watchlist != null && !Array.isArray(value.watchlist)) {
    throw new Error('备份文件的 watchlist 字段无效')
  }
  for (const raw of value.watchlist || []) {
    if (!raw || typeof raw !== 'object' || !/^\d{6}$/.test(String(raw.code || ''))) {
      throw new Error('自选基金数据无效')
    }
    if (raw.sectors != null && !Array.isArray(raw.sectors)) {
      throw new Error(`自选基金 ${raw.code} 的板块字段无效`)
    }
  }
}

export function validateImportConfig(payload: unknown) {
  assertImportPayload(payload)
  const value = payload as Partial<AppConfig>
  const fundCount = value.funds ? Object.keys(value.funds).length : 0
  const portfolioCount = value.portfolios ? Object.keys(value.portfolios).length : 0
  return {
    count: fundCount,
    watchCount: value.watchlist?.length || 0,
    portfolioCount,
    exportedAt: value.exportedAt || '',
    schemaVersion: value.schemaVersion || 1,
  }
}

export function importLocalConfig(payload: unknown): AppConfig {
  assertImportPayload(payload)
  return saveConfig(normalizeConfig(payload as Partial<AppConfig>))
}
