/**
 * update-seed.js
 * 매일 실행 → public/data/seed.json 의 probability·news 섹션 자동 갱신
 *
 * 데이터 소스
 *  - 확률: Polymarket gamma API (무료, 키 불필요)
 *  - 뉴스: 한국경제·매일경제·연합뉴스 RSS (무료, 키 불필요)
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');

const SEED_PATH = path.join(__dirname, '../public/data/seed.json');

// ── 유틸: HTTPS GET ──────────────────────────────────────────────
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (market-board-updater)',
        'Accept': 'application/json, text/xml, */*'
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// ── 유틸: XML CDATA 또는 일반 태그 추출 ─────────────────────────
function xmlVal(xml, tag) {
  const cdataMatch = xml.match(new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`));
  if (cdataMatch) return cdataMatch[1].trim();
  const tagMatch = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return tagMatch ? tagMatch[1].replace(/<[^>]+>/g, '').trim() : '';
}

// ── 오늘 날짜 (YYYY.MM.DD) ──────────────────────────────────────
function todayStr() {
  return new Date().toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).replace(/\. ?/g, '.').replace(/\.$/, '');
}

// ── 뉴스 태그 자동 분류 (우선순위 순) ───────────────────────────
const TAG_RULES = [
  { tag: 'geo',    label: '지정학', keywords: [
    '전쟁','종전','휴전','협상','제재','분쟁','긴장','지정학',
    '중동','우크라이나','러시아','대만','북한','이스라엘','하마스',
    '관세전쟁','무역분쟁','트럼프 관세','중국 관세',
  ]},
  { tag: 'fed',    label: '연준',   keywords: [
    '연준','FOMC','기준금리','통화정책','파월','금리인하','금리인상',
    'Fed','연방준비','빅컷','베이비컷',
  ]},
  { tag: 'energy', label: '에너지', keywords: [
    '원유','유가','WTI','OPEC','브렌트','천연가스','에너지','산유국',
    '석유','배럴','감산','증산',
  ]},
  { tag: 'tech',   label: '기술주', keywords: [
    '반도체','AI','엔비디아','애플','구글','메타','아마존','마이크로소프트',
    '빅테크','기술주','나스닥 기술','챗GPT','오픈AI',
  ]},
  { tag: 'corp',   label: '기업',   keywords: [
    '실적','어닝','순이익','영업이익','매출','주가 급등','주가 급락',
    '상장','IPO','배당','자사주','M&A','인수합병',
  ]},
  { tag: 'macro',  label: '거시',   keywords: [
    'GDP','고용','실업','인플레','CPI','PCE','소비자물가','경기','무역',
    '관세','달러','환율','경기침체','경제성장','소비','생산',
  ]},
  { tag: 'market', label: '시장',   keywords: [
    '증시','주가','S&P','다우','코스피','코스닥','주식','채권','국채',
    '금리','금값','금 시세','비트코인','암호화폐',
  ]},
];

function classifyTag(title, summary) {
  const text = title + ' ' + summary;
  for (const rule of TAG_RULES) {
    if (rule.keywords.some(k => text.includes(k))) {
      return { tag: rule.tag, tagLabel: rule.label };
    }
  }
  return { tag: 'macro', tagLabel: '거시' };
}

// ── 관련성 필터 ───────────────────────────────────────────────────
const MARKET_KEYWORDS = [
  // 글로벌 증시
  'S&P','나스닥','다우','증시','주가','주식','채권','국채','금리','통화',
  // 연준·중앙은행
  '연준','Fed','FOMC','파월','기준금리','통화정책','금리인하','금리인상',
  // 경제 지표
  'CPI','PCE','GDP','고용','실업','인플레','경기침체','무역','관세','달러','환율',
  // 지정학·국제
  '트럼프','중국','러시아','우크라이나','중동','이스라엘','하마스','대만','북한',
  '전쟁','종전','휴전','제재','지정학',
  // 원자재
  '원유','유가','WTI','OPEC','금값','금 시세','천연가스',
  // 기업·산업
  '실적','어닝','반도체','AI','빅테크','애플','엔비디아','나이키','테슬라',
  // 한국 관련
  '코스피','코스닥','원·달러','달러/원','한국은행','기재부',
];

function isMarketRelevant(title, summary) {
  const text = title + ' ' + summary;
  return MARKET_KEYWORDS.some(k => text.includes(k));
}

// ── 1) Polymarket 확률 데이터 ────────────────────────────────────
async function fetchProbability(currentProbability) {
  console.log('[probability] Polymarket 요청 중...');
  try {
    const [recRaw, fedRaw] = await Promise.all([
      httpsGet('https://gamma-api.polymarket.com/markets?slug=us-recession-by-end-of-2026'),
      httpsGet('https://gamma-api.polymarket.com/events?slug=how-many-fed-rate-cuts-in-2026'),
    ]);

    const recData = JSON.parse(recRaw);
    const fedData = JSON.parse(fedRaw);

    const safeParse = str => {
      if (!str) return [];
      try { return typeof str === 'string' ? JSON.parse(str) : str; }
      catch { return []; }
    };

    // 경기침체
    const recMarket = recData?.[0];
    const recPrices = safeParse(recMarket?.outcomePrices);
    const recYes = Math.round(parseFloat(recPrices[0] || 0) * 100);
    const recNo  = Math.round(parseFloat(recPrices[1] || 0) * 100);

    // 연준 금리 인하 횟수
    const fedEvent = fedData?.[0];
    const getPct = prefix => {
      const m = fedEvent?.markets?.find(m => m.groupItemTitle?.startsWith(prefix));
      if (!m) return 0;
      const prices = safeParse(m.outcomePrices);
      return Math.round(parseFloat(prices[0] || 0) * 100);
    };
    const fedZero = getPct('0');
    const fedOne  = getPct('1');
    const fedTwo  = getPct('2');
    const fedOther = Math.max(0, 100 - fedZero - fedOne - fedTwo);

    const updated = currentProbability.map(item => {
      if (item.title?.includes('경기침체') && item.type === 'binary') {
        return { ...item, yes: recYes, no: recNo, src: 'Polymarket' };
      }
      if (item.title?.includes('금리 인하') && item.type === 'multi') {
        return {
          ...item,
          outcomes: [
            { label: '0회 (동결)', pct: fedZero },
            { label: '1회 (25bp)', pct: fedOne },
            { label: '2회 (50bp)', pct: fedTwo },
          ],
          other: fedOther,
          src: 'Polymarket'
        };
      }
      return item;
    });

    console.log(`[probability] 경기침체 Yes=${recYes}% / 금리인하 0회=${fedZero}% 1회=${fedOne}% 2회=${fedTwo}%`);
    return updated;
  } catch (e) {
    console.error('[probability] 실패:', e.message);
    return null;
  }
}

// ── 2) 금융·글로벌 뉴스 RSS ──────────────────────────────────────
async function fetchNews() {
  console.log('[news] 뉴스 RSS 요청 중...');

  // 다양한 카테고리의 소스 — 실패해도 나머지로 진행
  const RSS_SOURCES = [
    // 국내 금융·경제
    { url: 'https://www.hankyung.com/feed/finance',      label: '한경 금융' },
    { url: 'https://www.hankyung.com/feed/economy',      label: '한경 경제' },
    { url: 'https://www.mk.co.kr/rss/40300001/',         label: '매경 경제' },
    // 국제·지정학
    { url: 'https://www.hankyung.com/feed/international',label: '한경 국제' },
    { url: 'https://www.mk.co.kr/rss/30100041/',         label: '매경 국제' },
    { url: 'https://www.yna.co.kr/rss/economy.xml',      label: '연합뉴스 경제' },
    { url: 'https://www.yna.co.kr/rss/international.xml',label: '연합뉴스 국제' },
    // 기업·산업
    { url: 'https://www.hankyung.com/feed/it',           label: '한경 IT' },
  ];

  const results = [];

  for (const source of RSS_SOURCES) {
    try {
      const xml = await httpsGet(source.url);
      const itemMatches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
      let count = 0;
      for (const [, content] of itemMatches) {
        const title   = xmlVal(content, 'title');
        const rawDesc = xmlVal(content, 'description').replace(/<[^>]+>/g, '').trim();
        // "(서울=연합뉴스) " 같은 출처 접두어 제거
        const desc = rawDesc.replace(/^\([^)]+\)\s*/, '').trim();
        // summary: 80자 이내로 자름
        const summary = desc ? desc.replace(/\s+/g, ' ').slice(0, 80) + (desc.length > 80 ? '…' : '') : '';

        if (!title || title.length < 5) continue;
        if (!isMarketRelevant(title, summary)) continue;

        const { tag, tagLabel } = classifyTag(title, summary);
        results.push({ tag, tagLabel, title, summary, why: '', date: todayStr() });
        count++;
      }
      console.log(`[news] ${source.label}: ${count}개`);
    } catch (e) {
      console.warn(`[news] ${source.label} 실패:`, e.message);
    }
  }

  if (results.length === 0) {
    console.warn('[news] 관련 뉴스를 가져오지 못했습니다.');
    return null;
  }

  // 1단계: 제목 중복 제거
  const seen = new Set();
  const deduped = results.filter(item => {
    if (seen.has(item.title)) return false;
    seen.add(item.title);
    return true;
  });

  // 2단계: summary 있는 항목 우선 정렬 (없는 건 뒤로)
  deduped.sort((a, b) => (b.summary ? 1 : 0) - (a.summary ? 1 : 0));

  // 3단계: 태그 다양성 확보 (같은 태그 최대 3개) + 최대 15개
  const tagCount = {};
  const unique = [];

  for (const item of deduped) {
    if ((tagCount[item.tag] || 0) >= 3) continue;
    tagCount[item.tag] = (tagCount[item.tag] || 0) + 1;
    unique.push(item);
    if (unique.length >= 15) break;
  }

  // 4단계: 15개 미만이면 태그 제한 해제 후 보충
  if (unique.length < 15) {
    const inUnique = new Set(unique.map(u => u.title));
    for (const item of deduped) {
      if (!inUnique.has(item.title)) {
        unique.push(item);
        if (unique.length >= 15) break;
      }
    }
  }

  console.log(`[news] 최종 ${unique.length}개 저장 (태그 분포: ${JSON.stringify(tagCount)})`);
  return unique;
}

// ── 메인 ─────────────────────────────────────────────────────────
async function main() {
  console.log('=== seed.json 업데이트 시작 ===');

  const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));

  const [probability, news] = await Promise.all([
    fetchProbability(seed.probability || []),
    fetchNews(),
  ]);

  let changed = false;

  if (probability) {
    seed.probability = probability;
    changed = true;
  }
  if (news) {
    seed.news = news;
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(SEED_PATH, JSON.stringify(seed, null, 2), 'utf8');
    console.log('=== seed.json 저장 완료 ===');
  } else {
    console.log('=== 변경 없음 (기존 데이터 유지) ===');
  }
}

main().catch(err => {
  console.error('업데이트 실패:', err);
  process.exit(1);
});
