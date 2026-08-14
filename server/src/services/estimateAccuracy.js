/**
 * 估值准确率服务
 * - 盘中自动捕获估值（仅交易时段）
 * - 净值公布后按日期匹配对比，计算误差
 * - 结果持久化到 server/data/estimate-accuracy.json
 * - 每交易日 22:00 定时拉取最新净值并对比
 */

import {readFileSync, writeFileSync, existsSync, mkdirSync} from 'node:fs'
import {resolve, dirname} from 'node:path'
import {fileURLToPath} from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(__dirname, '../../data')
const DATA_FILE = resolve(DATA_DIR, 'estimate-accuracy.json')
const TRACKED_FILE = resolve(DATA_DIR, 'tracked-funds.json')
const MAX_RECORDS = 60 // 保留最近 60 个交易日

function todayStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 将 netValueDate 统一为 YYYY-MM-DD，无法解析时返回空串 */
function normalizeDate(raw) {
  const s = String(raw || '').trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  return ''
}

function loadData() {
  try {
    if (!existsSync(DATA_FILE)) return {}
    const raw = readFileSync(DATA_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function saveData(data) {
  try {
    const dir = dirname(DATA_FILE)
    if (!existsSync(dir)) mkdirSync(dir, {recursive: true})
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
  } catch (e) {
    console.error('[estimateAccuracy] save error:', e.message)
  }
}

/** 判断是否为指数型基金（含"指数"字样） */
export function isIndexFund(ftype = '') {
  return /指数/.test(ftype)
}

/** 准确率阈值：指数基金 0.2%，其他基金 0.5% */
export function getThreshold(ftype = '') {
  return isIndexFund(ftype) ? 0.2 : 0.5
}

/**
 * 判断当前是否在 A 股交易时段内
 * 周一至周五 09:30 ~ 15:10
 */
function isMarketHours(now = new Date()) {
  const day = now.getDay()
  if (day === 0 || day === 6) return false // 周末
  const h = now.getHours()
  const m = now.getMinutes()
  const minutes = h * 60 + m
  return minutes >= 9 * 60 + 30 && minutes <= 15 * 60 + 10
}

/**
 * 持久化当前关注的基金列表（供定时任务使用）
 * 在 quotes 接口被调用时自动执行
 */
export function storeTrackedFunds(funds) {
  if (!Array.isArray(funds)) return
  const list = funds
    .filter((f) => f && /^\d{6}$/.test(String(f.code)))
    .map((f) => ({
      code: String(f.code),
      name: f.name || f.code,
      ftype: f.ftype || f.fundType || '',
      sectors: Array.isArray(f.sectors) ? f.sectors : [],
    }))
  if (!list.length) return
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, {recursive: true})
    writeFileSync(TRACKED_FILE, JSON.stringify(list, null, 2), 'utf-8')
  } catch (e) {
    console.error('[estimateAccuracy] storeTrackedFunds error:', e.message)
  }
}

/**
 * 读取当前关注的基金列表
 */
export function getTrackedFunds() {
  try {
    if (!existsSync(TRACKED_FILE)) return []
    const raw = readFileSync(TRACKED_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

/**
 * 处理单条 quote：捕获估值 + 对比净值
 * 在 /api/funds/quotes 接口中被调用，每次轮询自动执行
 *
 * 关键逻辑：
 * - 估值：仅交易时段内捕获，且净值尚未公布（netValueDate != today）
 * - 净值：按 netValueDate 匹配对应日期的记录，不限 today
 */
export function processQuote(quote) {
  if (!quote?.code) return null

  const data = loadData()
  const code = quote.code
  const today = todayStr()
  const ftype = quote.ftype || ''

  if (!data[code]) {
    data[code] = {name: quote.name || code, ftype, records: []}
  }

  data[code].name = quote.name || data[code].name || code
  data[code].ftype = ftype || data[code].ftype || ''

  const fund = data[code]
  const navDate = normalizeDate(quote.netValueDate)

  // ── 1. 捕获实际净值（按 netValueDate 匹配记录） ──
  let navUpdated = false
  if (navDate && quote.netValue != null && quote.netValue > 0) {
    let record = fund.records.find((r) => r.date === navDate)
    if (!record) {
      record = {
        date: navDate,
        estimateNav: null,
        estimateGrowth: null,
        actualNav: null,
        actualGrowth: null,
        error: null,
        accurate: null,
      }
      fund.records.push(record)
    }
    // 只在值变化时更新
    if (record.actualNav !== quote.netValue) {
      record.actualNav = quote.netValue
      record.actualGrowth = quote.dayGrowth ?? null
      navUpdated = true
    }
  }

  // ── 2. 捕获盘中估值（仅交易时段 + 净值未公布时） ──
  let estUpdated = false
  if (
    isMarketHours() &&
    quote.estimateNetValue != null &&
    quote.estimateNetValue > 0 &&
    navDate !== today // 净值尚未公布 today
  ) {
    // 防重复：如果估值与上一交易日完全相同，说明是旧数据，不创建今日记录
    const lastRecord = fund.records[fund.records.length - 1]
    const isStaleEstimate =
      lastRecord &&
      lastRecord.date !== today &&
      lastRecord.estimateNav === quote.estimateNetValue &&
      lastRecord.estimateGrowth === quote.estimateGrowth

    if (!isStaleEstimate) {
      let record = fund.records.find((r) => r.date === today)
      if (!record) {
        record = {
          date: today,
          estimateNav: null,
          estimateGrowth: null,
          actualNav: null,
          actualGrowth: null,
          error: null,
          accurate: null,
        }
        fund.records.push(record)
      }
      if (record.estimateNav !== quote.estimateNetValue) {
        record.estimateNav = quote.estimateNetValue
        record.estimateGrowth = quote.estimateGrowth ?? null
        estUpdated = true
      }
    }
  }

  // ── 3. 计算误差（估值和净值都有时） ──
  for (const record of fund.records) {
    if (
      record.estimateNav != null &&
      record.actualNav != null &&
      record.actualNav > 0 &&
      record.error == null
    ) {
      record.error = Math.abs(record.estimateNav - record.actualNav) / record.actualNav * 100
      record.accurate = record.error <= getThreshold(ftype)
    }
  }

  // ── 4. 裁剪历史 ──
  if (fund.records.length > MAX_RECORDS) {
    fund.records = fund.records.slice(-MAX_RECORDS)
  }

  // ── 5. 保存（有变化时） ──
  if (navUpdated || estUpdated || fund.records.some((r) => r.error != null && r.estimateNav != null && r.actualNav != null)) {
    saveData(data)
  }

  return navUpdated || estUpdated ? fund.records.find((r) => r.date === today || r.date === navDate) || null : null
}

/**
 * 批量处理 quotes 数组
 */
export function processQuotes(quotes) {
  if (!Array.isArray(quotes)) return
  for (const q of quotes) {
    try {
      processQuote(q)
    } catch {
      // 单条失败不影响其他
    }
  }
}

/**
 * 获取指定基金的准确率历史
 * @param {string[]} codes 基金代码列表，为空则返回全部
 */
export function getAccuracyData(codes = []) {
  const data = loadData()
  if (!codes.length) return data

  const result = {}
  for (const code of codes) {
    if (data[code]) result[code] = data[code]
  }
  return result
}

/**
 * 获取准确率汇总统计
 * 只统计最近一个已完成对比（error != null）的交易日，
 * 避免多天数据混在一起。当天的未完成记录不计入。
 */
export function getAccuracySummary(codes = []) {
  const data = getAccuracyData(codes)

  // 找出所有有 error 的记录中最新的日期
  let latestDate = ''
  for (const fund of Object.values(data)) {
    for (const record of fund.records) {
      if (record.error != null && record.date > latestDate) {
        latestDate = record.date
      }
    }
  }

  if (!latestDate) {
    return {totalRecords: 0, accurateCount: 0, accuracyRate: 0, avgError: 0, date: null}
  }

  // 只统计该日期的记录
  let totalRecords = 0
  let accurateCount = 0
  let totalError = 0
  let errorCount = 0

  for (const fund of Object.values(data)) {
    for (const record of fund.records) {
      if (record.error != null && record.date === latestDate) {
        totalRecords++
        totalError += record.error
        errorCount++
        if (record.accurate) accurateCount++
      }
    }
  }

  return {
    totalRecords,
    accurateCount,
    accuracyRate: totalRecords > 0 ? (accurateCount / totalRecords) * 100 : 0,
    avgError: errorCount > 0 ? totalError / errorCount : 0,
    date: latestDate,
  }
}

/**
 * 晚间定时对比任务：拉取所有关注基金的最新行情并处理
 * 在 index.js 中由定时器在每日 22:00 调用
 */
export async function runEveningComparison() {
  const funds = getTrackedFunds()
  if (!funds.length) {
    console.log('[estimateAccuracy] 无关注基金，跳过晚间对比')
    return {processed: 0, funds: 0}
  }

  console.log(`[estimateAccuracy] 开始晚间对比，共 ${funds.length} 只基金`)

  // 动态导入 fund.js，避免循环依赖
  const {getFundsQuotes} = await import('./fund.js')
  const quotes = await getFundsQuotes(funds)
  processQuotes(quotes)

  // 统计结果
  const data = loadData()
  let compared = 0
  for (const fund of Object.values(data)) {
    for (const record of fund.records) {
      if (record.error != null) compared++
    }
  }

  console.log(`[estimateAccuracy] 晚间对比完成，已对比 ${compared} 条记录`)
  return {processed: quotes.length, funds: funds.length, compared}
}
