import yf from 'yahoo-finance2';
import { withTimeout } from './utils/errors.js';

const yahooFinance = new yf();
if (yahooFinance.suppressNotices) yahooFinance.suppressNotices(['yahooSurvey']);

// 메모리 캐시 (ticker+days 키)
const _cache = {};
const CACHE_TTL = 30 * 60 * 1000; // 30분

export default async function handler(req, res) {
  const { ticker = '^GSPC', days = '30' } = req.query;
  const daysNum = Math.min(parseInt(days, 10) || 30, 365);

  const cacheKey = `${ticker}:${daysNum}`;
  if (_cache[cacheKey] && Date.now() - _cache[cacheKey].ts < CACHE_TTL) {
    return res.status(200).json({ ..._cache[cacheKey].data, _cached: true });
  }

  try {
    const period1 = new Date();
    period1.setDate(period1.getDate() - daysNum - 5); // 여유분 +5일

    const rows = await withTimeout(
      yahooFinance.historical(ticker, {
        period1: period1.toISOString().slice(0, 10),
        interval: '1d',
      }),
      10000
    );

    if (!rows || rows.length === 0) {
      return res.status(502).json({ error: 'no data' });
    }

    // 최신순 → 오래된순 정렬 후 최대 daysNum개
    const sorted = rows
      .filter(r => r.close != null)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-daysNum);

    const labels = sorted.map(r => {
      const d = new Date(r.date);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    });
    const data = sorted.map(r => parseFloat(r.close.toFixed(2)));

    const result = { labels, data };
    _cache[cacheKey] = { data: result, ts: Date.now() };
    return res.status(200).json({ ...result, _cached: false });

  } catch (err) {
    console.error(`[chart] ${ticker} error:`, err.message);
    return res.status(502).json({ error: 'fetch failed' });
  }
}
