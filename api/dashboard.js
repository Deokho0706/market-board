export default async function handler(req, res) {
  const API_KEY = process.env.FRED_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: 'FRED_API_KEY 설정이 누락되었습니다.' });
  }

  const getLatestValue = async (seriesId) => {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${API_KEY}&file_type=json&sort_order=desc&limit=5`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`FRED API fetch failed for ${seriesId}`);
    const data = await response.json();
    const obs = data.observations.find(o => o.value && o.value !== '.');
    return obs ? parseFloat(obs.value) : 0;
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

  try {
    const [us10y, us2y, fedfunds, polymarket] = await Promise.all([
      getLatestValue('DGS10'),
      getLatestValue('DGS2'),
      getLatestValue('FEDFUNDS'),
      getPolymarketData()
    ]);

    const spread = us10y - us2y;

    res.status(200).json({
      us10y: us10y.toFixed(2),
      us2y: us2y.toFixed(2),
      spread: spread.toFixed(2),
      fedfunds: fedfunds.toFixed(2),
      polymarket: polymarket || { 
        fed_cut: { yes: 0, no: 0, title: "Error" }, 
        recession: { yes: 0, no: 0, title: "Error" } 
      }
    });

  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: '데이터를 가져오는 중 오류가 발생했습니다.' });
  }
}
