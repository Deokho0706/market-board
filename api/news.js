import { withTimeout } from './utils/errors.js';

// 서버 인스턴스 메모리 캐시 (6시간)
let _cache = null;
let _cacheTime = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000;

export default async function handler(req, res) {
  const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
  if (!DEEPSEEK_KEY) {
    console.error('[news] missing DEEPSEEK_API_KEY');
    return res.status(200).json({ news: [], riskComment: null, error: 'API key not set' });
  }

  // 캐시 히트 (6시간)
  if (_cache && Date.now() - _cacheTime < CACHE_TTL) {
    return res.status(200).json({ ..._cache, cached: true });
  }

  // 쿼리 파라미터에서 현재 지표값 추출
  const { vix = '—', spread = '—', recession = '—', fg = '—', mich1y = '—', score = '—', grade = '—' } = req.query;

  const todayFmt = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
  const todayKo  = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

  const systemPrompt = `당신은 거시경제 분석가입니다. 투자자에게 유용한 핵심 시장 이슈를 한국어로 작성합니다.
반드시 유효한 JSON 배열만 반환하세요. 다른 텍스트나 마크다운 없이.`;

  const userPrompt = `${todayKo} 현재 시장 지표:
- VIX(변동성): ${vix}
- 장단기금리차(10Y-2Y): ${spread}%
- 경기침체 확률(Polymarket): ${recession}%
- 공포탐욕지수(CNN): ${fg}
- 미시건대 1년 기대인플레: ${mich1y}%
- 경제 위험도 점수: ${score}/100 (${grade})

아래 5개 주제 각각에 대해 이슈 1개씩 총 5개를 생성하세요:
1. 연준/금리 정책 — 금리 인하 경로, FOMC 입장
2. 거시경제 — 고용·CPI·GDP 지표, 인플레이션
3. 지정학·협상 — 전쟁 종전 협상, 정치·외교 리스크
4. 재정·국방 — 미국 국방비 확대, 부채 한도, 재정 적자
5. 국채·금융 — 국채 수요 약화, 외국인 보유, 금리-금 상관관계

반드시 아래 JSON 형식으로만 반환:
[
  {
    "tag": "fed",
    "tagLabel": "연준",
    "title": "30자 이내 제목",
    "summary": "2문장 이내 요약",
    "why": "투자자 시사점 1문장",
    "date": "${todayFmt}"
  }
]

tag 허용값: fed / macro / geo / policy / risk
tagLabel 허용값: 연준 / 거시 / 지정학 / 정책 / 리스크`;

  const commentPrompt = `현재 경제 위험도 점수는 ${score}점(${grade})입니다.
주요 지표: VIX ${vix}, 기대인플레 ${mich1y}%, 침체확률 ${recession}%, 장단기금리차 ${spread}%.
투자자를 위한 핵심 시사점을 한국어 2문장 이내로 간결하게 작성하세요.`;

  const callDeepSeek = (messages, maxTokens) =>
    withTimeout(
      fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEEPSEEK_KEY}` },
        body: JSON.stringify({ model: 'deepseek-chat', messages, temperature: 0.7, max_tokens: maxTokens })
      }),
      12000
    );

  try {
    const [newsRes, commentRes] = await Promise.all([
      callDeepSeek(
        [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        1400
      ),
      callDeepSeek(
        [{ role: 'user', content: commentPrompt }],
        180
      )
    ]);

    let news = [];
    let riskComment = null;

    if (newsRes.ok) {
      const d = await newsRes.json();
      const raw = d.choices?.[0]?.message?.content?.trim() || '[]';
      try {
        const match = raw.match(/\[[\s\S]*\]/);
        news = match ? JSON.parse(match[0]) : [];
      } catch (e) {
        console.error('[news] JSON parse failed:', e.message);
      }
    } else {
      console.error('[news] DeepSeek news status:', newsRes.status);
    }

    if (commentRes.ok) {
      const d = await commentRes.json();
      riskComment = d.choices?.[0]?.message?.content?.trim() || null;
    }

    const result = { news, riskComment };
    _cache = result;
    _cacheTime = Date.now();
    res.status(200).json(result);

  } catch (err) {
    console.error('[news] error:', err.message);
    res.status(200).json({ news: [], riskComment: null, error: 'AI 생성 실패' });
  }
}
