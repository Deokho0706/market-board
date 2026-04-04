import { withTimeout } from './utils/errors.js';

// 모듈 레벨 캐시 (같은 Vercel 인스턴스 내 유지)
let _cache = null;
let _cacheTs = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6시간

async function generateNews(indicators) {
  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
  if (!DEEPSEEK_API_KEY) throw new Error('DEEPSEEK_API_KEY not set');

  const { vix = 0, spread = 0, recession = 0, mich1y = 0, sp500Change = 0 } = indicators;

  const systemPrompt =
    '당신은 거시경제 분석가입니다. 현재 시장 지표를 바탕으로 오늘의 주요 리스크 뉴스를 한국어로 생성하세요. ' +
    '반드시 유효한 JSON 배열만 반환하세요. 다른 텍스트 없이.';

  const userPrompt =
    `현재 시장 지표:\n` +
    `- VIX: ${vix} (20↑ 경계, 30↑ 위험)\n` +
    `- 장단기금리차(10Y-2Y): ${spread}%\n` +
    `- 경기침체 확률(Polymarket): ${recession}%\n` +
    `- 미시건대 1년 기대인플레: ${mich1y}%\n` +
    `- S&P500 당일 변화: ${sp500Change}%\n\n` +
    `위 지표를 반영해 현재 거시경제 맥락에서 투자자가 주목해야 할 뉴스 4~5개를 다음 JSON 형식으로 생성하세요:\n` +
    `[\n` +
    `  {\n` +
    `    "tag": "risk|macro|fed|policy|geo",\n` +
    `    "tagLabel": "리스크|거시|연준|정책|지정학",\n` +
    `    "title": "뉴스 제목 (30자 내외)",\n` +
    `    "summary": "2~3문장 요약",\n` +
    `    "why": "투자자 시사점 1문장",\n` +
    `    "date": "${new Date().toISOString().slice(0, 10).replace(/-/g, '.')}"\n` +
    `  }\n` +
    `]`;

  const res = await withTimeout(
    fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1200,
      }),
    }),
    15000
  );

  if (!res.ok) throw new Error(`DeepSeek HTTP ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim() ?? '';

  // JSON 블록 추출 (```json ... ``` 감싸인 경우 처리)
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('No JSON array in DeepSeek response');
  return JSON.parse(match[0]);
}

export default async function handler(req, res) {
  // CORS 허용 (같은 도메인)
  res.setHeader('Access-Control-Allow-Origin', '*');

  // 캐시 히트
  if (_cache && Date.now() - _cacheTs < CACHE_TTL) {
    return res.status(200).json({ news: _cache, _cached: true });
  }

  // 쿼리 파라미터로 지표 수신 (프론트에서 전달)
  const indicators = {
    vix:        parseFloat(req.query.vix)        || 0,
    spread:     parseFloat(req.query.spread)     || 0,
    recession:  parseFloat(req.query.recession)  || 0,
    mich1y:     parseFloat(req.query.mich1y)     || 0,
    sp500Change: parseFloat(req.query.sp500Change) || 0,
  };

  try {
    const news = await generateNews(indicators);
    _cache  = news;
    _cacheTs = Date.now();
    return res.status(200).json({ news, _cached: false });
  } catch (err) {
    console.error('[news] DeepSeek error:', err.message);
    // fallback: 캐시가 있으면 만료된 캐시라도 반환
    if (_cache) return res.status(200).json({ news: _cache, _cached: true, _stale: true });
    return res.status(500).json({ error: 'news generation failed' });
  }
}
