export default async function handler(req, res) {
  const API_KEY = process.env.FRED_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: 'FRED_API_KEY 설정이 누락되었습니다.' });
  }

  // FRED에서 가장 최근의 유효한 수치를 가져오는 헬퍼 함수
  // (가끔 공휴일에 값이 '.'으로 내려오는 경우가 있어 5경우를 가져와 제일 첫 정상값을 탐색)
  const getLatestValue = async (seriesId) => {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${API_KEY}&file_type=json&sort_order=desc&limit=5`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`FRED API fetch failed for ${seriesId}`);
    }
    const data = await response.json();
    const obs = data.observations.find(o => o.value && o.value !== '.');
    return obs ? parseFloat(obs.value) : 0;
  };

  try {
    const [us10y, us2y, fedfunds] = await Promise.all([
      getLatestValue('DGS10'),
      getLatestValue('DGS2'),
      getLatestValue('FEDFUNDS')
    ]);

    const spread = us10y - us2y;

    res.status(200).json({
      us10y: us10y.toFixed(2),
      us2y: us2y.toFixed(2),
      spread: spread.toFixed(2),
      fedfunds: fedfunds.toFixed(2)
    });

  } catch (error) {
    console.error("FRED API Error:", error);
    res.status(500).json({ error: '데이터를 가져오는 중 오류가 발생했습니다.' });
  }
}
