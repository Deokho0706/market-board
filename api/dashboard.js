import { getFredData } from './providers/fred.js';
import yf from 'yahoo-finance2';
const yahooFinance = new yf();
if (yahooFinance.suppressNotices) {
  yahooFinance.suppressNotices(['yahooSurvey']);
}

export default async function handler(req, res) {
  const API_KEY = process.env.FRED_API_KEY;

  if (!API_KEY) {
    console.error('[dashboard] missing required env var: FRED_API_KEY');
    return res.status(500).json({ error: '서비스 설정을 확인 중입니다.' });
  }

  const getPolymarketData = async () => {
    try {
      // 1. 경기침체 관련
      const recRes = await fetch('https://gamma-api.polymarket.com/markets?slug=us-recession-by-end-of-2026');
      const recData = await recRes.json();
      const recMarket = recData && recData.length > 0 ? recData[0] : null;

      // 2. 연준 금리 인하 횟수 (2026)
      const fedRes = await fetch('https://gamma-api.polymarket.com/events?slug=how-many-fed-rate-cuts-in-2026');
      const fedData = await fedRes.json();
      const fedEvent = fedData && fedData.length > 0 ? fedData[0] : null;

      // 파싱 도구
      const safeParse = (str) => {
        if (!str) return [];
        try { return typeof str === 'string' ? JSON.parse(str) : str; } 
        catch (e) { return []; }
      };

      // 경기침체 파싱 (outcomePrices[0] * 100)
      let recessionData = { yes: 0, no: 0, title: "US Recession by End of 2026" };
      if (recMarket) {
        const prices = safeParse(recMarket.outcomePrices);
        recessionData = {
          yes: Math.round(parseFloat(prices[0] || 0) * 100),
          no: Math.round(parseFloat(prices[1] || 0) * 100),
          title: recMarket.question || recessionData.title
        };
      }

      // 금리 인하 횟수 파싱
      let fedCutsData = { zero: 0, one: 0, two: 0, title: "How many Fed rate cuts in 2026?" };
      if (fedEvent && fedEvent.markets) {
        const getPct = (prefix) => {
          const m = fedEvent.markets.find(m => m.groupItemTitle && m.groupItemTitle.startsWith(prefix));
          if (m) {
            const prices = safeParse(m.outcomePrices);
            return Math.round(parseFloat(prices[0] || 0) * 100);
          }
          return 0;
        };

        fedCutsData = {
          zero: getPct("0"),
          one: getPct("1"),
          two: getPct("2"),
          title: fedEvent.title || fedCutsData.title
        };
      }

      return {
        recession: recessionData,
        fed_cuts_2026: fedCutsData
      };
    } catch (err) {
      console.error("Polymarket Error:", err);
      return {
        recession: { yes: 0, no: 0, title: "Error" },
        fed_cuts_2026: { zero: 0, one: 0, two: 0, title: "Error" }
      };
    }
  };

  const getYahooData = async (ticker, noDecimals = false) => {
    try {
      const quote = await yahooFinance.quote(ticker);
      const price = quote.regularMarketPrice;
      const change = quote.regularMarketChangePercent || 0;
      
      if (price === undefined) return null;

      return {
        price: price.toLocaleString('en-US', { 
          minimumFractionDigits: noDecimals ? 0 : 2, 
          maximumFractionDigits: noDecimals ? 0 : 2 
        }),
        change: change > 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`,
        raw: parseFloat(change.toFixed(2))
      };
    } catch(err) {
      console.error(`Yahoo Finance Error for ${ticker}:`, err);
      return null;
    }
  };

  try {
    const [fred, polymarket, sp500, nasdaq, vix, dxy, krw, wti, gold] = await Promise.all([
      getFredData(API_KEY),
      getPolymarketData(),
      getYahooData('^GSPC', true),
      getYahooData('^IXIC', true),
      getYahooData('^VIX', false),
      getYahooData('DX-Y.NYB', false),
      getYahooData('KRW=X', true),
      getYahooData('CL=F', false),
      getYahooData('GC=F', true)
    ]);

    // ── polymarket 정규화 (부분 응답 안전 처리) ──
    const fallbackPoly = {
      recession:     { yes: 0, no: 0, title: 'Error' },
      fed_cuts_2026: { zero: 0, one: 0, two: 0, title: 'Error' }
    };
    const poly = {
      recession:     polymarket?.recession     ?? fallbackPoly.recession,
      fed_cuts_2026: polymarket?.fed_cuts_2026 ?? fallbackPoly.fed_cuts_2026
    };

    // ── provider별 status 판정 ──
    const providers = {
      fred:       { status: 'live' },
      yahoo:      { status: 'live' },
      polymarket: { status: 'live' }
    };
    const errors = {};

    // FRED
    const fredNullCount = [fred.us10y, fred.us2y, fred.fedfunds].filter(v => v === null).length;
    if (fredNullCount === 3)    { providers.fred.status = 'down';    errors.fred = 'all series null'; }
    else if (fredNullCount > 0) { providers.fred.status = 'partial'; errors.fred = `${fredNullCount}/3 series null`; }
    // 기대인플레는 보조 지표 — null이어도 core status 영향 없음

    // Yahoo — sp500+nasdaq 둘 다 null이면 핵심 없음 → down
    const yahooAll = [sp500, nasdaq, vix, dxy, krw, wti, gold];
    const yahooFailCount = yahooAll.filter(v => v === null).length;
    if (yahooFailCount === yahooAll.length || (sp500 === null && nasdaq === null)) {
      providers.yahoo.status = 'down';    errors.yahoo = `${yahooFailCount}/${yahooAll.length} tickers null`;
    } else if (yahooFailCount > 0) {
      providers.yahoo.status = 'partial'; errors.yahoo = `${yahooFailCount}/${yahooAll.length} tickers null`;
    }

    // Polymarket — recession + fed_cuts_2026 각각 확인
    const recErr = poly.recession.title === 'Error';
    const fedErr = poly.fed_cuts_2026.title === 'Error';
    if (recErr && fedErr)      { providers.polymarket.status = 'down';    errors.polymarket = 'fetch failed'; }
    else if (recErr || fedErr) { providers.polymarket.status = 'partial'; errors.polymarket = 'some markets unavailable'; }

    // overallStatus: FALLBACK = fred+yahoo 둘 다 비정상(partial/down 포함)
    const fredOk  = providers.fred.status === 'live';
    const yahooOk = providers.yahoo.status === 'live';
    const polyOk  = providers.polymarket.status === 'live';
    const overallStatus =
      (fredOk && yahooOk && polyOk) ? 'live'
      : (!fredOk && !yahooOk)       ? 'fallback'
      : 'partial';

    const spread = (fred.us10y !== null && fred.us2y !== null) ? (fred.us10y - fred.us2y) : null;

    res.status(200).json({
      market: { sp500, nasdaq, vix, dxy, krw, wti, gold },
      us10y:    fred.us10y?.toFixed(2) ?? null,
      us2y:     fred.us2y?.toFixed(2)  ?? null,
      spread:   spread !== null ? spread.toFixed(2) : null,
      fedfunds: fred.fedfunds?.toFixed(2) ?? null,
      mich1y:   fred.mich1y ?? null,
      mich5y:   fred.mich5y ?? null,
      polymarket: poly,
      _meta: {
        status:     overallStatus,
        updated_at: new Date().toISOString(),
        sources:    ['fred', 'yahoo', 'polymarket'],
        providers,
        errors:     Object.keys(errors).length > 0 ? errors : {}
      }
    });

  } catch (error) {
    console.error('[dashboard] internal error:', error);
    res.status(500).json({ error: '데이터를 불러오는 중 오류가 발생했습니다.' });
  }
}
