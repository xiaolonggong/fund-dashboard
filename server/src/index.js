import Koa from 'koa';
import cors from '@koa/cors';
import bodyParser from 'koa-bodyparser';
import {createReadStream, existsSync, statSync} from 'node:fs';
import {extname, join, normalize, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import router from './routes.js';
import {runEveningComparison} from './services/estimateAccuracy.js';

const app = new Koa();
const PORT = Number(process.env.FUND_DASHBOARD_PORT) || 51888;
const HOST = '127.0.0.1';
const distDir = resolve(fileURLToPath(new URL('../../web/dist/', import.meta.url)));

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

app.use(cors());
app.use(bodyParser());

app.use(async (ctx, next) => {
  const start = Date.now();
  try {
    await next();
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = { success: false, message: err.message || '服务器错误' };
    console.error('[error]', err);
  }
  const ms = Date.now() - start;
  console.log(`${ctx.method} ${ctx.url} ${ctx.status} ${ms}ms`);
});

app.use(router.routes()).use(router.allowedMethods());

app.use(async (ctx) => {
  if (ctx.method !== 'GET' && ctx.method !== 'HEAD') return;
  if (!existsSync(distDir)) {
    ctx.status = 503;
    ctx.body = '前端尚未构建，请先运行 npm run build';
    return;
  }

  const requestPath = decodeURIComponent(ctx.path).replace(/^\/+/, '');
  const candidate = resolve(join(distDir, normalize(requestPath)));
  const safeCandidate = candidate.startsWith(distDir) ? candidate : '';
  const filePath =
    safeCandidate && existsSync(safeCandidate) && statSync(safeCandidate).isFile()
      ? safeCandidate
      : join(distDir, 'index.html');

  ctx.type = MIME_TYPES[extname(filePath)] || 'application/octet-stream';
  ctx.body = createReadStream(filePath);
});

app.listen(PORT, HOST, () => {
  console.log(`基金看板已启动：http://${HOST}:${PORT}`);
  scheduleEveningComparison();
});

// ── 每交易日 22:00 定时拉取净值并对比估值准确率 ──
const EVENING_HOUR = 22; // 10 PM
const EVENING_MINUTE = 0;

function scheduleEveningComparison() {
  function getNextDelay() {
    const now = new Date();
    const next = new Date(now);
    next.setHours(EVENING_HOUR, EVENING_MINUTE, 0, 0);
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
    return next.getTime() - now.getTime();
  }

  async function tick() {
    const now = new Date();
    const day = now.getDay();
    // 周末不执行（非交易日，净值不更新）
    if (day === 0 || day === 6) {
      console.log('[estimateAccuracy] 周末，跳过晚间对比');
    } else {
      console.log(`[estimateAccuracy] 定时任务触发 (${now.toLocaleString('zh-CN')})`);
      try {
        await runEveningComparison();
      } catch (e) {
        console.error('[estimateAccuracy] 定时任务异常:', e.message);
      }
    }
    // 安排下一次
    setTimeout(tick, getNextDelay());
  }

  const delay = getNextDelay();
  const nextTime = new Date(Date.now() + delay);
  console.log(`[estimateAccuracy] 晚间对比定时已安排：${nextTime.toLocaleString('zh-CN')}`);
  setTimeout(tick, delay);
}
