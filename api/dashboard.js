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

  const getLatestValue = async (seriesId) => {
    try {
      const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${API_KEY}&file_type=json&sort_order=desc&limit=5`;
      const response = await fetch(url);
      if (!response.ok) return null;
      
      const data = await response.json();
      const obs = data.observations?.find(o => o.value && o.value !== '.');
      
      return obs ? parseFloat(obs.value) : null;
    } catch (err) {
      console.error(`FRED API Error for ${seriesId}:`, err);
      return null;
    }
  };

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
    const [us10y, us2y, fedfunds, polymarket, sp500, nasdaq, vix, dxy, krw, wti, gold] = await Promise.all([
      getLatestValue('DGS10'),
      getLatestValue('DGS2'),
      getLatestValue('FEDFUNDS'),
      getPolymarketData(),
      getYahooData('^GSPC', true),
      getYahooData('^IXIC', true),
      getYahooData('^VIX', false),
      getYahooData('DX-Y.NYB', false),
      getYahooData('KRW=X', true),
      getYahooData('CL=F', false),
      getYahooData('GC=F', true)
    ]);

    const spread = (us10y !== null && us2y !== null) ? (us10y - us2y) : null;

    res.status(200).json({
      market: { sp500, nasdaq, vix, dxy, krw, wti, gold },
      us10y: us10y !== null ? us10y.toFixed(2) : null,
      us2y: us2y !== null ? us2y.toFixed(2) : null,
      spread: spread !== null ? spread.toFixed(2) : null,
      fedfunds: fedfunds !== null ? fedfunds.toFixed(2) : null,
      polymarket: polymarket || { 
        fed_cut: { yes: 0, no: 0, title: "Error" }, 
        recession: { yes: 0, no: 0, title: "Error" } 
      }
    });

  } catch (error) {
    console.error('[dashboard] internal error:', error);
    res.status(500).json({ error: '데이터를 불러오는 중 오류가 발생했습니다.' });
  }
}
