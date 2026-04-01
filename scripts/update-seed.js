/**
 * update-seed.js
 * 매일 실행 → public/data/seed.json 의 probability·news 섹션 자동 갱신
 *
 * 데이터 소스
 *  - 확률: Polymarket gamma API (무료, 키 불필요)
 *  - 뉴스: 연합뉴스 경제 RSS (무료, 키 불필요)
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

// ── 뉴스 태그 자동 분류 ─────────────────────────────────────────
const TAG_RULES = [
  { tag: 'fed',   label: '연준',   keywords: ['연준','FOMC','금리인하','기준금리','통화정책','파월','Fed'] },
  { tag: 'risk',  label: '리스크', keywords: ['리스크','위기','지정학','전쟁','충돌','불안','급락','폭락','공포'] },
  { tag: 'macro', label: '거시',   keywords: ['GDP','고용','실업','인플레','CPI','소비자물가','경기','무역'] },
  { tag: 'market',label: '시장',   keywords: ['증시','주가','S&P','나스닥','코스피','주식','채권'] },
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

// ── 관련성 필터: 주요 금융·시장 키워드 포함 시만 채택 ─────────────
const MARKET_KEYWORDS = [
  // 글로벌 시장
  'S&P','나스닥','다우','증시','주가','주식','채권','국채','금리','통화',
  // 연준·중앙은행
  '연준','Fed','FOMC','파월','기준금리','통화정책','금리인하','금리인상',
  // 경제 지표
  'CPI','PCE','GDP','고용','인플레','경기침체','무역','관세','달러',
  // 지정학·리스크
  '트럼프','중국','관세','지정학','전쟁','원유','WTI','금값',
  // 기업·산업
  '실적','어닝','반도체','AI','빅테크','애플','엔비디아',
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

    // 기존 probability 배열 복사 후 값만 교체
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
    return null; // 실패 시 기존 데이터 유지
  }
}

// ── 2) 금융 뉴스 RSS ─────────────────────────────────────────────
async function fetchNews() {
  console.log('[news] 뉴스 RSS 요청 중...');
  const RSS_URLS = [
    'https://www.hankyung.com/feed/finance',   // 한국경제 금융
    'https://www.hankyung.com/feed/economy',   // 한국경제 경제
    'https://www.mk.co.kr/rss/40300001/',      // 매일경제 경제
  ];

  try {
    const results = [];
    for (const url of RSS_URLS) {
      try {
        const xml = await httpsGet(url);
        const itemMatches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
        for (const [, content] of itemMatches) {
          const title   = xmlVal(content, 'title');
          const summary = xmlVal(content, 'description').replace(/<[^>]+>/g, '').slice(0, 150);
          if (!title || title.length < 5) continue;
          // 금융·시장 관련 기사만 채택
          if (!isMarketRelevant(title, summary)) continue;
          const { tag, tagLabel } = classifyTag(title, summary);
          results.push({ tag, tagLabel, title, summary, why: '', date: todayStr() });
        }
      } catch (e) {
        console.warn(`[news] ${url} 실패:`, e.message);
      }
    }

    if (results.length === 0) {
      console.warn('[news] 관련 뉴스를 가져오지 못했습니다.');
      return null;
    }

    // 중복 제거 + 최대 6개
    const seen = new Set();
    const unique = results.filter(item => {
      if (seen.has(item.title)) return false;
      seen.add(item.title);
      return true;
    }).slice(0, 6);

    console.log(`[news] ${unique.length}개 뉴스 항목 갱신`);
    return unique;
  } catch (e) {
    console.error('[news] 실패:', e.message);
    return null;
  }
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
