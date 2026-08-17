import axios from 'axios'

const ua =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'

const INDEX_LIST = [
  {group: 'A股', secid: '1.000001', code: '000001', name: '上证指数', tx: 'sh000001'},
  {group: 'A股', secid: '0.399001', code: '399001', name: '深证成指', tx: 'sz399001'},
  {group: 'A股', secid: '0.399006', code: '399006', name: '创业板指', tx: 'sz399006'},
  {group: 'A股', secid: '0.899050', code: '899050', name: '北证50', sina: 'bj899050'},
  {group: 'A股', secid: '1.000688', code: '000688', name: '科创50', tx: 'sh000688'},
  {group: 'A股', secid: '1.000016', code: '000016', name: '上证50', tx: 'sh000016'},
  {group: 'A股', secid: '1.000300', code: '000300', name: '沪深300', tx: 'sh000300'},
  {group: 'A股', secid: '1.000905', code: '000905', name: '中证500', tx: 'sh000905'},
  {group: 'A股', secid: '1.000852', code: '000852', name: '中证1000', tx: 'sh000852'},
  {group: 'A股', secid: '1.000906', code: '000906', name: '中证800', tx: 'sh000906'},
  {group: 'A股', secid: '1.932000', code: '932000', name: '中证2000', tx: 'sh932000'},
  {group: 'A股', secid: '0.399997', code: '399997', name: '中证白酒', tx: 'sz399997'},
  {group: '港股', secid: '100.HSI', code: 'HSI', name: '恒生指数', tx: 'hkHSI'},
  {group: '港股', secid: '124.HSTECH', code: 'HSTECH', name: '恒生科技指数', tx: 'hkHSTECH'},
  {group: '美股', secid: '100.NDX', code: 'NDX', name: '纳斯达克100', tx: 'us.NDX', sinaUs: '.NDX'},
  {group: '美股', secid: '100.SPX', code: 'SPX', name: '标普500', tx: 'us.INX', sinaUs: '.INX'},
  {
    group: '日韩',
    secid: '100.N225',
    code: 'N225',
    name: '日经225',
    nikkeiOfficial: true,
  },
  {
    group: '日韩',
    secid: '100.KS11',
    code: 'KS11',
    name: '首尔综合指数',
    naver: 'KOSPI',
  },
  // ---- 业绩基准专用指数（benchOnly 不展示在首页指数列表，仅用于基金业绩基准对比）----
  {
    group: '基准指数',
    benchOnly: true,
    secid: '1.000510',
    code: '000510',
    name: '中证A500',
    tx: 'sh000510',
  },
  {
    group: '基准指数',
    benchOnly: true,
    secid: '1.000985',
    code: '000985',
    name: '中证全指',
    tx: 'sh000985',
  },
  {
    group: '基准指数',
    benchOnly: true,
    secid: '0.399989',
    code: '399989',
    name: '中证医疗',
    tx: 'sz399989',
  },
  {
    group: '基准指数',
    benchOnly: true,
    secid: '0.399808',
    code: '399808',
    name: '中证新能源',
    tx: 'sz399808',
  },
  {
    group: '基准指数',
    benchOnly: true,
    secid: '0.399976',
    code: '399976',
    name: '中证新能源汽车',
    tx: 'sz399976',
  },
  // 中证全指半导体产品与设备指数（H30184）无公开历史数据源，
  // 用国证半导体芯片（980017，新浪有 2019 年至今全历史）近似
  {
    group: '基准指数',
    benchOnly: true,
    secid: '0.980017',
    code: '980017',
    name: '国证半导体芯片',
    tx: 'sz980017',
  },
  {
    group: '基准指数',
    benchOnly: true,
    secid: '0.399986',
    code: '399986',
    name: '中证银行',
    tx: 'sz399986',
  },
  {
    group: '基准指数',
    benchOnly: true,
    secid: '0.399967',
    code: '399967',
    name: '中证军工',
    tx: 'sz399967',
  },
  {
    group: '基准指数',
    benchOnly: true,
    secid: '0.399933',
    code: '399933',
    name: '中证医药',
    tx: 'sz399933',
  },
  {
    group: '基准指数',
    benchOnly: true,
    secid: '0.399932',
    code: '399932',
    name: '中证消费',
    tx: 'sz399932',
  },
  {
    group: '基准指数',
    benchOnly: true,
    secid: '1.000932',
    code: '000932',
    name: '中证主要消费',
    tx: 'sh000932',
  },
  {
    group: '基准指数',
    benchOnly: true,
    secid: '1.000942',
    code: '000942',
    name: '中证内地消费主题',
    tx: 'sh000942',
  },
  {
    group: '基准指数',
    benchOnly: true,
    secid: '1.000977',
    code: '000977',
    name: '中证内地低碳经济',
    tx: 'sh000977',
  },
  // 中证红利：新浪数据停在 2019 年（过期），改用中证官网全历史优先
  {
    group: '基准指数',
    benchOnly: true,
    secid: '1.000922',
    code: '000922',
    name: '中证红利',
    tx: 'sh000922',
    csindex: '000922',
  },
  // 中证人工智能主题（930713）：腾讯/新浪均无历史，仅中证官网有
  {
    group: '基准指数',
    benchOnly: true,
    secid: '1.930713',
    code: '930713',
    name: '中证人工智能主题',
    csindex: '930713',
  },
  // 中证沪港深高股息（930917，即"沪港深高股息精选"）：仅中证官网有
  {
    group: '基准指数',
    benchOnly: true,
    secid: '1.930917',
    code: '930917',
    name: '中证沪港深高股息',
    csindex: '930917',
  },
  // 黄金基准（Au99.99）：无公开指数历史源，用华安黄金ETF(518880) 近似（跟踪Au99.99）
  {
    group: '基准指数',
    benchOnly: true,
    secid: '1.518880',
    code: '518880',
    name: '华安黄金ETF(Au99.99近似)',
    tx: 'sh518880',
  },
]

/** 区间 → 回溯自然日（再按交易日过滤） */
const RANGE_CALENDAR_DAYS = {
  '1m': 35,
  '3m': 100,
  '6m': 200,
  '1y': 400,
  '3y': 1200,
}

const RANGE_FETCH_LIMIT = {
  '1m': 60,
  '3m': 120,
  '6m': 200,
  '1y': 320,
  '3y': 900,
}

async function eastmoneyGet(url, params, hosts) {
  let lastErr
  for (const host of hosts) {
    try {
      const res = await axios.get(`${host}${url}`, {
        timeout: 12000,
        headers: {
          'User-Agent': ua,
          Referer: 'https://quote.eastmoney.com/',
        },
        params,
      })
      return res.data
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr || new Error('eastmoney request failed')
}

const PUSH_HOSTS = [
  'https://push2delay.eastmoney.com',
  'https://push2.eastmoney.com',
  'https://82.push2.eastmoney.com',
]

export async function getIndices() {
  const visibleIndexes = INDEX_LIST.filter((i) => !i.benchOnly)
  const secids = visibleIndexes.map((i) => i.secid).join(',')
  const data = await eastmoneyGet(
    '/api/qt/ulist.np/get',
    {
      fltt: 2,
      invt: 2,
      fields: 'f2,f3,f4,f5,f6,f12,f14,f15,f16,f17,f18,f124',
      secids,
    },
    PUSH_HOSTS,
  )

  const diff = data?.data?.diff || []
  const byCode = new Map(diff.map((d) => [String(d.f12), d]))
  const numberOrNull = (value) =>
    typeof value === 'number' && Number.isFinite(value) ? value : null

  return visibleIndexes.map((item) => {
    const row = byCode.get(item.code) || byCode.get(item.secid.split('.')[1])
    return {
      code: item.code,
      name: item.name,
      group: item.group,
      percent: numberOrNull(row?.f3),
      price: numberOrNull(row?.f2),
      change: numberOrNull(row?.f4),
      open: numberOrNull(row?.f17),
      high: numberOrNull(row?.f15),
      low: numberOrNull(row?.f16),
      previousClose: numberOrNull(row?.f18),
      volume: numberOrNull(row?.f5),
      amount: numberOrNull(row?.f6),
      updatedAt:
        typeof row?.f124 === 'number' && row.f124 > 0
          ? new Date(row.f124 * 1000).toISOString()
          : null,
    }
  })
}

/** 概念榜噪音：短线情绪 / 风格 / 资金口径，不是题材板块 */
const NOISY_CONCEPT_BOARD =
  /昨日|连板|涨停|跌停|微盘|举牌|高标|回笼|次新|破发|含一字|龙虎榜|融资融券|沪股通|深股通|同花顺|成交额|换手|高市净|高市盈|低价股|百元股|基金重仓|券商金股|科技风格|大盘成长|小盘成长|大盘股|小盘股|近期新高|百日新高|历史新高/

function normalizeConceptBoardName(name = '') {
  return String(name || '')
    .trim()
    .replace(/概念$/u, '')
    .trim()
}

/** 东财概念板块涨跌幅排行（fs=m:90+t:3）；过滤短线噪音后取前 size */
export async function getSectorBoards({sort = 'desc', size = 10} = {}) {
  const data = await eastmoneyGet(
    '/api/qt/clist/get',
    {
      pn: 1,
      pz: 120,
      po: sort === 'asc' ? 0 : 1,
      np: 1,
      fltt: 2,
      invt: 2,
      fid: 'f3',
      // t:2 行业 / t:3 概念
      fs: 'm:90+t:3',
      fields: 'f12,f14,f2,f3',
    },
    PUSH_HOSTS,
  )

  const list = (data?.data?.diff || [])
    .map((d) => {
      const rawName = String(d.f14 || '').trim()
      return {
        code: d.f12,
        name: normalizeConceptBoardName(rawName),
        rawName,
        percent: typeof d.f3 === 'number' ? d.f3 : null,
      }
    })
    .filter(
      (d) =>
        d.percent != null &&
        d.name &&
        !NOISY_CONCEPT_BOARD.test(d.rawName) &&
        !NOISY_CONCEPT_BOARD.test(d.name),
    )
    .sort((a, b) => (sort === 'asc' ? a.percent - b.percent : b.percent - a.percent))
    .slice(0, size)
    .map(({code, name, percent}) => ({code, name, percent}))

  return list
}

// ---- 涨跌家数：全量 A 股统计（含沪深主板/创业板/科创板/北交所）----
// 旧接口 emdatah5 GetUpDownData 只覆盖约 5186 只，漏了约 700 只，
// 改为从 push2delay clist 逐页拉取全部 5800+ 只并自行统计。
// 结果缓存 2 分钟，避免每次请求都拉 59 页。

const BREADTH_CACHE_TTL = 120_000 // 2 min
let breadthCache = null // {data, expiry}

const ALL_ASHARE_FS = 'm:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048'
const CLIST_PAGE_SIZE = 100
const CLIST_BATCH = 20 // 并发批次大小

async function fetchClistPage(page) {
  const data = await eastmoneyGet(
    '/api/qt/clist/get',
    {
      pn: page,
      pz: CLIST_PAGE_SIZE,
      po: 1,
      np: 1,
      fltt: 2,
      invt: 2,
      fid: 'f12',
      fs: ALL_ASHARE_FS,
      fields: 'f3',
    },
    PUSH_HOSTS,
  )
  return {
    total: data?.data?.total || 0,
    diff: data?.data?.diff || [],
  }
}

export async function getUpDownStats() {
  // 命中缓存直接返回
  if (breadthCache && Date.now() < breadthCache.expiry) {
    return breadthCache.data
  }

  try {
    // 先取第一页拿到 total
    const first = await fetchClistPage(1)
    const totalStocks = first.total
    if (!totalStocks) {
      return {up: 0, down: 0, flat: 0, time: null}
    }

    const totalPages = Math.ceil(totalStocks / CLIST_PAGE_SIZE)
    let up = 0
    let down = 0
    let flat = 0

    // 统计第一页
    for (const d of first.diff) {
      const pct = d.f3
      if (typeof pct !== 'number' || !Number.isFinite(pct)) continue
      if (pct > 0) up += 1
      else if (pct < 0) down += 1
      else flat += 1
    }

    // 并发拉取剩余页（每批 CLIST_BATCH 页）
    const remainingPages = []
    for (let p = 2; p <= totalPages; p += 1) {
      remainingPages.push(p)
    }

    for (let i = 0; i < remainingPages.length; i += CLIST_BATCH) {
      const batch = remainingPages.slice(i, i + CLIST_BATCH)
      const results = await Promise.all(batch.map((p) => fetchClistPage(p)))
      for (const r of results) {
        for (const d of r.diff) {
          const pct = d.f3
          if (typeof pct !== 'number' || !Number.isFinite(pct)) continue
          if (pct > 0) up += 1
          else if (pct < 0) down += 1
          else flat += 1
        }
      }
    }

    const now = new Date()
    const result = {
      up,
      down,
      flat,
      time: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`,
    }

    breadthCache = {data: result, expiry: Date.now() + BREADTH_CACHE_TTL}
    return result
  } catch (e) {
    // 降级：如果全量拉取失败，尝试旧接口
    try {
      const res = await axios.get('https://emdatah5.eastmoney.com/dc/NXFXB/GetUpDownData', {
        timeout: 12000,
        headers: {'User-Agent': ua, Referer: 'https://emdatah5.eastmoney.com/'},
        params: {type: 0},
      })
      const row = Array.isArray(res.data) ? res.data[0] : res.data?.[0]
      if (!row) return {up: 0, down: 0, flat: 0, time: null}
      return {
        up: Number(row.up) || 0,
        down: Number(row.down) || 0,
        flat: Number(row.t) || 0,
        time: row.time || null,
      }
    } catch {
      return {up: 0, down: 0, flat: 0, time: null}
    }
  }
}

export async function getMarketOverview() {
  const [upDown, topGainers, topLosers] = await Promise.all([
    getUpDownStats(),
    getSectorBoards({sort: 'desc', size: 10}),
    getSectorBoards({sort: 'asc', size: 10}),
  ])
  return {upDown, topGainers, topLosers}
}

function findIndexMeta(code) {
  const key = String(code || '').trim()
  return INDEX_LIST.find((i) => i.code === key || i.secid.endsWith(`.${key}`))
}

function round4(n) {
  return Math.round(Number(n) * 10000) / 10000
}

function filterByRange(points, range) {
  const days = RANGE_CALENDAR_DAYS[range] || RANGE_CALENDAR_DAYS['1m']
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - days)
  const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
  return points.filter((p) => p.date >= startStr)
}

function withPeriodPercent(points) {
  if (!points.length) return []
  const base = points[0].close
  if (!base) return points.map((p) => ({...p, percent: null}))
  return points.map((p) => ({
    ...p,
    percent: round4(((p.close - base) / base) * 100),
  }))
}

async function fetchTencentDaily(symbol, limit) {
  const res = await axios.get('https://web.ifzq.gtimg.cn/appstock/app/fqkline/get', {
    timeout: 15000,
    headers: {'User-Agent': ua, Referer: 'https://gu.qq.com/'},
    params: {param: `${symbol},day,,,${limit},qfq`},
  })
  const key = Object.keys(res.data?.data || {})[0]
  const rows = res.data?.data?.[key]?.qfqday || res.data?.data?.[key]?.day || []
  return rows
    .map((row) => {
      const close = parseFloat(row[2])
      return {
        date: row[0],
        close: Number.isFinite(close) ? close : null,
      }
    })
    .filter((p) => p.date && p.close != null)
}

async function fetchEastmoneyDaily(secid, limit) {
  const res = await axios.get(
    'https://push2his.eastmoney.com/api/qt/stock/kline/get',
    {
      timeout: 15000,
      headers: {'User-Agent': ua, Referer: 'https://quote.eastmoney.com/'},
      params: {
        secid,
        fields1: 'f1,f2,f3,f4,f5,f6',
        fields2: 'f51,f52,f53,f54,f55,f56',
        klt: 101,
        fqt: 0,
        end: 20500000,
        lmt: limit,
      },
    },
  )
  const rows = res.data?.data?.klines || []
  return rows
    .map((row) => {
      const parts = String(row || '').split(',')
      const close = parseFloat(parts[2])
      return {
        date: parts[0],
        close: Number.isFinite(close) ? close : null,
      }
    })
    .filter((p) => p.date && p.close != null)
}

async function fetchSinaCnDaily(symbol, limit) {
  const res = await axios.get(
    'https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData',
    {
      timeout: 15000,
      headers: {'User-Agent': ua, Referer: 'https://finance.sina.com.cn/'},
      params: {symbol, scale: 240, ma: 'no', datalen: limit},
    },
  )
  const rows = Array.isArray(res.data) ? res.data : []
  return rows
    .map((row) => {
      const close = parseFloat(row.close)
      return {
        date: row.day,
        close: Number.isFinite(close) ? close : null,
      }
    })
    .filter((p) => p.date && p.close != null)
}

/**
 * 中证指数官网全历史日线（覆盖 2004 年至今，中证 000/930/931/H30 系列均可）。
 * 腾讯/新浪缺失的中证主题指数（人工智能、沪港深高股息等）唯一可用的公开源。
 */
async function fetchCsindexDaily(indexCode, limit) {
  const res = await axios.get(
    'https://www.csindex.com.cn/csindex-home/perf/index-perf',
    {
      timeout: 20000,
      headers: {'User-Agent': ua, Referer: 'https://www.csindex.com.cn/'},
      params: {indexCode, startDate: '20040101', endDate: '20991231'},
    },
  )
  const rows = Array.isArray(res.data?.data) ? res.data.data : []
  const points = rows
    .map((row) => {
      const d = String(row.tradeDate || '')
      const close = parseFloat(row.close)
      if (d.length !== 8 || !Number.isFinite(close)) return null
      return {
        date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`,
        close,
      }
    })
    .filter((p) => p)
  return limit && points.length > limit ? points.slice(-limit) : points
}

async function fetchSinaUsDaily(symbol, limit) {
  const res = await axios.get(
    'https://stock.finance.sina.com.cn/usstock/api/json.php/US_MinKService.getDailyK',
    {
      timeout: 20000,
      headers: {'User-Agent': ua, Referer: 'https://stock.finance.sina.com.cn/'},
      params: {symbol},
    },
  )
  const rows = Array.isArray(res.data) ? res.data : []
  const mapped = rows
    .map((row) => {
      const close = parseFloat(row.c)
      return {
        date: row.d,
        close: Number.isFinite(close) ? close : null,
      }
    })
    .filter((p) => p.date && p.close != null)
  return mapped.slice(-limit)
}

async function fetchNikkeiOfficialDaily(limit) {
  const res = await axios.get(
    'https://indexes.nikkei.co.jp/nkave/historical/nikkei_stock_average_daily_en.csv',
    {
      timeout: 20000,
      headers: {'User-Agent': ua, Referer: 'https://indexes.nikkei.co.jp/'},
      responseType: 'text',
    },
  )
  return String(res.data || '')
    .split(/\r?\n/)
    .map((line) => {
      const [rawDate, rawClose] = line.replaceAll('"', '').split(',')
      const close = parseFloat(rawClose)
      return {
        date: /^\d{4}\/\d{2}\/\d{2}$/.test(rawDate)
          ? rawDate.replaceAll('/', '-')
          : '',
        close: Number.isFinite(close) ? close : null,
      }
    })
    .filter((p) => p.date && p.close != null)
    .slice(-limit)
}

async function fetchNaverIndexDaily(symbol, limit) {
  const pageSize = 50
  const pages = Math.ceil(limit / pageSize)
  const points = []

  for (let page = 1; page <= pages; page += 1) {
    const res = await axios.get(
      `https://m.stock.naver.com/api/index/${encodeURIComponent(symbol)}/price`,
      {
        timeout: 15000,
        headers: {'User-Agent': ua, Referer: 'https://m.stock.naver.com/'},
        params: {page, pageSize},
      },
    )
    const rows = Array.isArray(res.data) ? res.data : []
    points.push(
      ...rows
        .map((row) => {
          const close = parseFloat(String(row.closePrice || '').replaceAll(',', ''))
          return {
            date: String(row.localTradedAt || ''),
            close: Number.isFinite(close) ? close : null,
          }
        })
        .filter((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.date) && p.close != null),
    )
    if (rows.length < pageSize) break
  }

  return points
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-limit)
}

/**
 * 指数历史日线（用于趋势弹窗）
 * @param {string} code
 * @param {'1m'|'3m'|'6m'|'1y'|'3y'} range
 */
export async function getIndexHistory(code, range = '1m') {
  const meta = findIndexMeta(code)
  if (!meta) throw new Error(`未知指数 ${code}`)
  const key = RANGE_CALENDAR_DAYS[range] ? range : '1m'
  const limit = RANGE_FETCH_LIMIT[key]

  let points = []
  let source = ''

  try {
    points = await fetchEastmoneyDaily(meta.secid, limit)
    source = 'eastmoney'
  } catch {
    points = []
  }

  // 腾讯日线作为备用（A股多数指数、美股 us.NDX / us.INX）
  if (points.length < 10 && meta.tx) {
    try {
      points = await fetchTencentDaily(meta.tx, limit)
      source = 'tencent'
    } catch {
      points = []
    }
  }

  // 点数不足时用新浪补（北证 / 美股长周期）
  if (points.length < 10 && meta.sina) {
    points = await fetchSinaCnDaily(meta.sina, limit)
    source = 'sina'
  }
  if ((points.length < 10 || key === '3y') && meta.sinaUs) {
    try {
      const usPoints = await fetchSinaUsDaily(meta.sinaUs, limit)
      if (usPoints.length > points.length) {
        points = usPoints
        source = 'sina-us'
      }
    } catch {
      // keep previous
    }
  }

  // 日韩指数：东财历史接口无数值时，使用当地公开行情补齐。
  if ((points.length < 10 || key === '3y') && meta.nikkeiOfficial) {
    try {
      const officialPoints = await fetchNikkeiOfficialDaily(limit)
      if (officialPoints.length > points.length) {
        points = officialPoints
        source = 'nikkei-official'
      }
    } catch {
      // keep previous
    }
  }
  if ((points.length < 10 || key === '3y') && meta.naver) {
    try {
      const naverPoints = await fetchNaverIndexDaily(meta.naver, limit)
      if (naverPoints.length > points.length) {
        points = naverPoints
        source = 'naver'
      }
    } catch {
      // keep previous
    }
  }

  if (!points.length) throw new Error(`暂无 ${meta.name} 历史行情`)

  const filtered = withPeriodPercent(filterByRange(points, key))
  const first = filtered[0]
  const last = filtered[filtered.length - 1]
  const periodPercent =
    first && last && first.close
      ? round4(((last.close - first.close) / first.close) * 100)
      : null

  return {
    code: meta.code,
    name: meta.name,
    range: key,
    source,
    periodPercent,
    points: filtered,
  }
}

/**
 * 指数全量历史日线（用于基金业绩基准对比，需覆盖基金成立以来完整区间）
 * @param {string} code 指数代码（见 INDEX_LIST）
 * @returns {Promise<{code:string, name:string, points: Array<{date:string, close:number}>}>}
 */
/**
 * 数据新鲜度检查：最后一条行情距今超过 12 天视为过期（覆盖长假），
 * 防止"有数据但已停更"的源（如新浪 000922 停在 2019 年）被误用。
 */
function isIndexFresh(points) {
  if (!points.length) return false
  const last = points[points.length - 1]
  const t = Date.parse(last.date)
  if (!Number.isFinite(t)) return false
  return Date.now() - t < 12 * 24 * 3600 * 1000
}

export async function getIndexFullHistory(code) {
  const meta = findIndexMeta(code)
  if (!meta) throw new Error(`未知指数 ${code}`)
  const EM_LIMIT = 3500
  const TX_LIMIT = 2000
  const SINA_LIMIT = 3500
  let points = []
  // 中证官网全历史最完整，标记了 csindex 的指数优先使用
  if (meta.csindex) {
    try {
      points = await fetchCsindexDaily(meta.csindex, 6000)
    } catch {
      points = []
    }
  }
  if (!isIndexFresh(points)) {
    try {
      points = await fetchEastmoneyDaily(meta.secid, EM_LIMIT)
    } catch {
      points = []
    }
  }
  // A股指数：腾讯 tx 符号（sh/sz 开头）可直接复用为新浪兜底源，覆盖更长历史
  const sinaSymbol = meta.sina || (meta.tx && /^s[hz]/.test(meta.tx) ? meta.tx : undefined)
  // 新浪历史较长，优先于腾讯；但需通过新鲜度检查，过期数据继续走腾讯兜底
  if (!isIndexFresh(points) && sinaSymbol) {
    try {
      points = await fetchSinaCnDaily(sinaSymbol, SINA_LIMIT)
    } catch {
      points = []
    }
  }
  if (!isIndexFresh(points) && meta.tx) {
    try {
      points = await fetchTencentDaily(meta.tx, TX_LIMIT)
    } catch {
      points = []
    }
  }
  if (!isIndexFresh(points) && meta.sinaUs) {
    try {
      points = await fetchSinaUsDaily(meta.sinaUs, SINA_LIMIT)
    } catch {
      points = []
    }
  }
  if (!isIndexFresh(points)) throw new Error(`暂无 ${meta.name} 有效历史行情`)
  return {code: meta.code, name: meta.name, points}
}
