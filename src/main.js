// ────────── XSS 방어 ──────────
function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ────────── DATA STORAGE ──────────
let MOCK_MARKET = [];
let MOCK_PROB = [];
let MOCK_NEWS = [];
let lastMeta = null;

// ────────── TOOLTIP & GROUP DATA ──────────
const MARKET_TIPS = {
  'S&P 500':      { def: '미국 대형주 500개 종합지수', hint: '꾸준한 상승은 경기 확장 기대 반영', warn: '단기 등락은 노이즈일 수 있음' },
  'NASDAQ':       { def: '미국 기술주 중심 지수', hint: 'S&P 500 대비 금리 변화에 더 민감', warn: '기술주 집중으로 섹터 편향 있음' },
  'VIX':          { def: '향후 30일 S&P 500 변동성 기대치', hint: '20↑ 경계, 30↑ 공포 확대 신호', warn: 'VIX 급등만으로 바닥 단정 금지' },
  '달러인덱스':   { def: '주요 6개 통화 대비 달러 강도 (DXY)', hint: '상승 시 신흥국·원자재 부담 가능', warn: '항상 주식과 반대로 움직이지 않음' },
  '달러/원':      { def: '달러 대비 원화 환율', hint: '상승 = 원화 약세, 수입 물가 부담', warn: '외환시장 개입으로 단기 왜곡 가능' },
  'WTI 원유':     { def: '미국 기준 원유 가격 (USD/배럴)', hint: '에너지 비용·인플레이션 선행 지표', warn: '지정학 이벤트로 단기 급변동 빈번' },
  '금':           { def: '대표 안전자산 (USD/온스)', hint: '불확실성·인플레 우려 시 상승 경향', warn: '달러 강세 구간에선 동반 하락 가능' },
  '미국 10Y':     { def: '미국 10년물 국채 수익률', hint: '장기 성장·물가 기대 반영', warn: '급등은 긴축 우려, 급락은 경기침체 우려' },
  '미국 2Y':      { def: '미국 2년물 국채 수익률', hint: '단기 통화정책 기대치에 가장 민감', warn: 'Fed 발언 하나에 급변동 가능' },
  '장단기금리차': { def: '미국 10Y - 2Y 수익률 차이', hint: '음수(역전) 시 경기침체 선행 신호', warn: '역전 후 실제 침체까지 1~2년 시차 존재' },
  '연준 기준금리': { def: '연준이 설정한 기준금리', hint: '높을수록 유동성 부담, 낮을수록 완화', warn: '시장은 현재보다 향후 경로 기대에 더 민감' },
  '공포탐욕':     { def: 'CNN 기반 복합 심리 지수 (0–100)', hint: '극단 공포(≤25) 구간은 역발상 시각 존재', warn: '심리 지표 단독 매매 신호 금지' },
};

const MARKET_GROUP_ORDER = [
  { label: '핵심 시장',   items: ['S&P 500', 'NASDAQ', 'VIX'] },
  { label: '달러·환율',   items: ['달러인덱스', '달러/원'] },
  { label: '금리',        items: ['미국 10Y', '미국 2Y', '장단기금리차', '연준 기준금리'] },
  { label: '원자재·실물', items: ['WTI 원유', '금'] },
  { label: '심리·보조',   items: ['공포탐욕'] },
];

// ────────── CHART DATA ──────────
function genSP500(days) {
  const labels = [], data = []; let v = 100;
  const now = new Date();
  for (let i = days; i >= 0; i--) {
    const dt = new Date(now);
    dt.setDate(dt.getDate() - i);
    labels.push(`${dt.getMonth() + 1}/${dt.getDate()}`);
    v += (Math.random() - 0.47) * 1.2;
    data.push(+v.toFixed(2));
  }
  return { labels, data };
}

function genVIX(days) {
  const labels = [], data = []; let v = 22;
  const now = new Date();
  for (let i = days; i >= 0; i--) {
    const dt = new Date(now);
    dt.setDate(dt.getDate() - i);
    labels.push(`${dt.getMonth() + 1}/${dt.getDate()}`);
    v += (Math.random() - 0.5) * 1.5;
    v = Math.max(12, Math.min(40, v));
    data.push(+v.toFixed(2));
  }
  return { labels, data };
}

// ────────── UTILS ──────────
function fmtTs(d) {
  return d.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// FIX: 버튼 스피너 상태를 한 곳에서 관리하는 헬퍼 함수
function setBtnState(id, loading) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.classList.toggle('spinning', loading);
  btn.classList.toggle('loading', loading);
}

// FIX: 캐시 히트 여부를 타임스탬프 표시에 반영
function setTs(id, d, fromCache) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = fromCache ? `${fmtTs(d)} (캐시)` : fmtTs(d);
  el.classList.toggle('cached', !!fromCache);
}

// FIX: 프로그레스바 transition을 실제로 작동시키는 애니메이션 헬퍼
// innerHTML 교체 직후에는 브라우저가 레이아웃을 계산하기 전이라 transition이 안 걸림
// rAF 두 번 돌려서 브라우저가 초기 width:0을 "그린 뒤" 목표값으로 전환
function animateBars(container) {
  const fills = container.querySelectorAll('.binary-bar-fill, .multi-bar-fill');
  fills.forEach(el => {
    const target = el.dataset.pct + '%';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { el.style.width = target; });
    });
  });
}

// FIX: skeleton 렌더 — 로딩 중 빈 화면 대신 shimmer 플레이스홀더 표시
function showSkeleton(gridId, count) {
  const g = document.getElementById(gridId);
  g.innerHTML = Array.from({ length: count }, () =>
    `<div class="skeleton"></div>`
  ).join('');
}

// ────────── INFO MODAL ──────────
let _activeTrigger = null;
let _infoModalInited = false;

function hideTip() {
  const modal = document.getElementById('info-modal');
  const backdrop = document.getElementById('info-modal-backdrop');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  if (backdrop) backdrop.classList.remove('open');
  document.body.style.overflow = '';
  const prev = _activeTrigger;
  if (prev) {
    prev.setAttribute('aria-expanded', 'false');
    _activeTrigger = null;
    prev.focus();
  }
}

function showTip(trigger) {
  const label = trigger.dataset.tipLabel;
  const tips = MARKET_TIPS[label];
  if (!tips) return;

  const modal = document.getElementById('info-modal');
  const backdrop = document.getElementById('info-modal-backdrop');
  if (!modal) return;

  // 같은 트리거 재클릭 → 토글 닫힘
  if (_activeTrigger === trigger) { hideTip(); return; }

  // 이전 트리거 aria 초기화
  if (_activeTrigger) _activeTrigger.setAttribute('aria-expanded', 'false');

  // 콘텐츠 채우기
  modal.innerHTML = `
    <button type="button" class="tip-close-btn" aria-label="설명 닫기">×</button>
    <div id="tip-popover-title" class="tip-title">${escHtml(label)}</div>
    <div class="tip-row">
      <div class="tip-row-label def">정의</div>
      <div>${escHtml(tips.def)}</div>
    </div>
    <div class="tip-row">
      <div class="tip-row-label hint">해석</div>
      <div>${escHtml(tips.hint)}</div>
    </div>
    <div class="tip-row">
      <div class="tip-row-label warn">주의</div>
      <div>${escHtml(tips.warn)}</div>
    </div>`;

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'tip-popover-title');
  if (backdrop) backdrop.classList.add('open');
  document.body.style.overflow = 'hidden';

  _activeTrigger = trigger;
  trigger.setAttribute('aria-expanded', 'true');
  modal.querySelector('.tip-close-btn').addEventListener('click', hideTip);
}

function initInfoModal() {
  if (_infoModalInited) return;
  _infoModalInited = true;

  if (!document.getElementById('info-modal')) {
    const modal = document.createElement('div');
    modal.id = 'info-modal';
    modal.setAttribute('aria-hidden', 'true');
    document.body.appendChild(modal);
  }
  if (!document.getElementById('info-modal-backdrop')) {
    const bd = document.createElement('div');
    bd.id = 'info-modal-backdrop';
    document.body.appendChild(bd);
  }

  // 이벤트 위임 — 카드 전체 클릭
  document.getElementById('market-grid').addEventListener('click', e => {
    const trigger = e.target.closest('[data-tip-label]');
    if (trigger) { e.stopPropagation(); showTip(trigger); }
  });

  // 키보드 접근성 (Enter/Space)
  document.getElementById('market-grid').addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      const trigger = e.target.closest('[data-tip-label]');
      if (trigger) { e.preventDefault(); e.stopPropagation(); showTip(trigger); }
    }
  });

  // backdrop 클릭 닫힘
  document.getElementById('info-modal-backdrop').addEventListener('click', hideTip);

  // 외부 클릭 닫힘
  document.addEventListener('click', e => {
    if (!e.target.closest('#info-modal') && !e.target.closest('[data-tip-label]')) hideTip();
  });

  // ESC 닫힘 (포커스 복원은 hideTip 내부 처리)
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') hideTip();
  });
}

// ────────── STATUS BADGE ──────────
function updateStatusBadge(meta) {
  const el = document.getElementById('data-status-badge');
  if (!el) return;
  if (!meta) { el.textContent = ''; return; }
  const map = {
    live:     'LIVE — 실시간 데이터 (FRED · Yahoo Finance · Polymarket)',
    partial:  'PARTIAL — 일부 데이터는 지연 또는 대체값일 수 있습니다',
    fallback: 'FALLBACK — 외부 API 응답 지연, 예비 데이터 표시 중'
  };
  el.textContent = map[meta.status] ?? '';
  el.dataset.status = meta.status ?? '';
}

// ────────── RENDER ──────────
function renderMarket() {
  const g = document.getElementById('market-grid');
  g.innerHTML = '';

  const renderCard = (item) => {
    const cls = item.raw > 0 ? 'up' : item.raw < 0 ? 'down' : 'neutral';
    const chg = item.change
      ? `<div class="mcard-change ${cls}">${item.change}</div>` : '';
    const tips = MARKET_TIPS[item.label];
    const d = document.createElement('div');
    d.className = `mcard ${cls} fade-in`;
    if (tips) {
      d.dataset.tipLabel = item.label;
      d.setAttribute('role', 'button');
      d.setAttribute('tabindex', '0');
      d.setAttribute('aria-expanded', 'false');
      d.setAttribute('aria-controls', 'info-modal');
      d.setAttribute('aria-label', `${item.label} 지표 설명`);
    }
    d.innerHTML = `
  <div class="mcard-head"><div class="mcard-label">${escHtml(item.label)}</div></div>
  <div class="mcard-value">${item.value}</div>
  ${chg}
  <div class="mcard-sub">${item.sub}</div>`;
    g.appendChild(d);
  };

  // 그룹 순서대로 섹션 헤더 + 카드 렌더
  MARKET_GROUP_ORDER.forEach(group => {
    const groupItems = MOCK_MARKET.filter(item => group.items.includes(item.label));
    if (groupItems.length === 0) return;
    const header = document.createElement('div');
    header.className = 'market-section-header';
    header.textContent = group.label;
    g.appendChild(header);
    group.items.forEach(label => {
      const item = groupItems.find(m => m.label === label);
      if (item) renderCard(item);
    });
  });

  // 그룹 미정의 항목 안전망 렌더
  const assigned = new Set(MARKET_GROUP_ORDER.flatMap(grp => grp.items));
  MOCK_MARKET.filter(item => !assigned.has(item.label)).forEach(renderCard);
}

function renderProb() {
  const g = document.getElementById('prob-grid');
  g.innerHTML = '';
  MOCK_PROB.forEach(item => {
    const d = document.createElement('div');
    d.className = 'pcard fade-in';
    if (item.type === 'binary') {
      // FIX: data-pct 속성으로 목표값 저장 → animateBars()가 읽어서 transition 적용
      d.innerHTML = `
    <div class="pcard-type binary">BINARY</div>
    <div class="pcard-title">${item.title}</div>
    <div class="binary-main">
      <span class="binary-yes-label">Yes</span>
      <span class="binary-yes-pct">${item.yes}%</span>
    </div>
    <div class="binary-bar">
      <div class="binary-bar-fill" data-pct="${item.yes}"></div>
    </div>
    <div class="binary-no">No <span>${item.no}%</span></div>
    <div class="pcard-src">${item.src}</div>`;
    } else {
      const rows = item.outcomes.map((o, i) => `
    <div class="multi-row">
      <div class="multi-row-head">
        <span class="multi-row-label">${o.label}</span>
        <span class="multi-row-pct ${i === 0 ? 'top' : ''}">${o.pct}%</span>
      </div>
      <div class="multi-bar">
        <div class="multi-bar-fill ${i === 0 ? 'top' : ''}" data-pct="${o.pct}"></div>
      </div>
    </div>`).join('');
      d.innerHTML = `
    <div class="pcard-type multi">MULTI-OUTCOME</div>
    <div class="pcard-title">${item.title}</div>
    <div class="multi-rows">${rows}</div>
    <div class="multi-other">기타 ${item.other}% (나머지 아웃컴)</div>
    <div class="pcard-src">${item.src}</div>`;
    }
    g.appendChild(d);
  });
  // FIX: 렌더 직후 animateBars 호출
  animateBars(g);
}

function renderNews() {
  const g = document.getElementById('news-grid');
  g.innerHTML = '';
  MOCK_NEWS.forEach(item => {
    const d = document.createElement('div');
    d.className = 'ncard fade-in';
    d.innerHTML = `
  <span class="ncard-tag ${item.tag}">${escHtml(item.tagLabel)}</span>
  <div class="ncard-title">${escHtml(item.title)}</div>
  <div class="ncard-summary">${escHtml(item.summary)}</div>
  <div class="ncard-why">${escHtml(item.why)}</div>
  <div class="ncard-meta">
    <span class="ncard-date">${escHtml(item.date)}</span>
  </div>`;
    g.appendChild(d);
  });
}

// ────────── CHARTS ──────────
// FIX: Chart 인스턴스를 전역 객체로 관리 — buildCharts가 여러 번 호출돼도 안전하게 destroy
const charts = {};

function chartOpts() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#111318',
        borderColor: '#2a3040', borderWidth: 1,
        titleColor: '#8a96a8', bodyColor: '#c8d0dc',
        titleFont: { family: 'IBM Plex Mono', size: 10 },
        bodyFont: { family: 'IBM Plex Mono', size: 11 },
      }
    },
    scales: {
      x: {
        ticks: { color: '#8a96a8', font: { family: 'IBM Plex Mono', size: 10 }, maxTicksLimit: 6, maxRotation: 0 },
        grid: { color: '#1e2229' }
      },
      y: {
        ticks: { color: '#8a96a8', font: { family: 'IBM Plex Mono', size: 10 } },
        grid: { color: '#1e2229' }
      }
    }
  };
}

function drawSP(days) {
  const { labels, data } = genSP500(days);
  const canvas = document.getElementById('chart-sp');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  // FIX: destroy 먼저, 그 다음 새 차트 생성
  if (charts.sp) { charts.sp.destroy(); charts.sp = null; }
  const grad = ctx.createLinearGradient(0, 0, 0, 180);
  grad.addColorStop(0, 'rgba(0,212,170,0.18)');
  grad.addColorStop(1, 'rgba(0,212,170,0)');
  charts.sp = new Chart(ctx, {
    type: 'line',
    data: {
      labels, datasets: [{
        data, borderColor: '#00d4aa', borderWidth: 1.5,
        backgroundColor: grad, fill: true, tension: 0.3, pointRadius: 0, pointHoverRadius: 4,
        pointHoverBackgroundColor: '#00d4aa'
      }]
    },
    options: chartOpts()
  });
}

function drawVIX(days) {
  const { labels, data } = genVIX(days);
  const canvas = document.getElementById('chart-vix');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (charts.vix) { charts.vix.destroy(); charts.vix = null; }
  const grad = ctx.createLinearGradient(0, 0, 0, 180);
  grad.addColorStop(0, 'rgba(244,63,94,0.15)');
  grad.addColorStop(1, 'rgba(244,63,94,0)');
  charts.vix = new Chart(ctx, {
    type: 'line',
    data: {
      labels, datasets: [{
        data, borderColor: '#f43f5e', borderWidth: 1.5,
        backgroundColor: grad, fill: true, tension: 0.3, pointRadius: 0, pointHoverRadius: 4,
        pointHoverBackgroundColor: '#f43f5e'
      }]
    },
    // FIX: 원본 코드의 annotation spread 패턴은 plugins를 덮어씌워 tooltip이 손실됨 → chartOpts() 직접 사용
    options: chartOpts()
  });
}

function switchTab(btn, chartKey, days) {
  btn.closest('.chart-tabs')
    .querySelectorAll('.chart-tab')
    .forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (chartKey === 'sp') drawSP(days);
  if (chartKey === 'vix') drawVIX(days);
}

// FIX: 차트 DOM을 매번 재생성하지 않고, 최초 1회만 구조 빌드 → 이후 drawSP/drawVIX만 호출
let chartsBuilt = false;
function buildCharts() {
  const g = document.getElementById('chart-grid');
  if (!chartsBuilt) {
    g.innerHTML = `
  <div class="chart-card fade-in">
    <div class="chart-card-head">
      <div>
        <div class="chart-card-title">S&P 500 추이</div>
        <div class="chart-card-sub">^GSPC · 상대지수(기준=100)</div>
      </div>
      <div class="chart-tabs">
        <button class="chart-tab active" onclick="switchTab(this,'sp',30)">1M</button>
        <button class="chart-tab" onclick="switchTab(this,'sp',90)">3M</button>
        <button class="chart-tab" onclick="switchTab(this,'sp',365)">1Y</button>
      </div>
    </div>
    <div class="chart-wrap"><canvas id="chart-sp"></canvas></div>
  </div>
  <div class="chart-card fade-in">
    <div class="chart-card-head">
      <div>
        <div class="chart-card-title">VIX 변동성 지수</div>
        <div class="chart-card-sub">CBOE · 20↑ 경계 · 30↑ 위험</div>
      </div>
      <div class="chart-tabs">
        <button class="chart-tab active" onclick="switchTab(this,'vix',30)">1M</button>
        <button class="chart-tab" onclick="switchTab(this,'vix',90)">3M</button>
        <button class="chart-tab" onclick="switchTab(this,'vix',365)">1Y</button>
      </div>
    </div>
    <div class="chart-wrap"><canvas id="chart-vix"></canvas></div>
  </div>`;
    chartsBuilt = true;
  }
  drawSP(30);
  drawVIX(30);
}

// ────────── CACHE & RELOAD ──────────
const CACHE = {};
const CACHE_TTL = { market: 90000, prob: 900000, news: 1800000 }; // ms

// FIX: simulateFetch 대신 실제 fetch 연동
// FIX: simulateFetch 대신 실제 fetch 연동
async function simulateFetch(section) {
  try {
    const res = await fetch('/data/seed.json');
    if (!res.ok) throw new Error('Fetch failed');
    const data = await res.json();

    let apiData = null;
    lastMeta = null;
    try {
      const apiRes = await fetch('/api/dashboard', { cache: 'no-store' });
      if (!apiRes.ok) console.error('[api] status:', apiRes.status);
      else apiData = await apiRes.json();
      lastMeta = apiData?._meta ?? {
        status: 'fallback', updated_at: new Date().toISOString(),
        sources: [], providers: {}, errors: { fetch: 'api unavailable or invalid response' }
      };
    } catch (err) {
      console.error('API error:', err);
      lastMeta = {
        status: 'fallback', updated_at: new Date().toISOString(),
        sources: [], providers: {}, errors: { fetch: 'api request failed' }
      };
    }

    if (section === 'market' || !section) {
      MOCK_MARKET = data.market || [];
      if (apiData) {
        const updateFredItem = (label, value) => {
          if (value === null) return;
          const idx = MOCK_MARKET.findIndex(m => m.label === label);
          if (idx > -1) {
            MOCK_MARKET[idx].value = value + "%";
            MOCK_MARKET[idx].change = '';
            MOCK_MARKET[idx].sub    = 'FRED';
            MOCK_MARKET[idx].raw = 0; // neutral class
          } else {
            MOCK_MARKET.push({
              label, value: value + '%', change: '', raw: 0, sub: 'FRED'
            });
          }
        };
        updateFredItem("미국 10Y", apiData.us10y);
        updateFredItem("장단기금리차", apiData.spread);
        updateFredItem("연준 기준금리", apiData.fedfunds);

        const updateYahooItem = (label, yData) => {
          if (!yData) return;
          const idx = MOCK_MARKET.findIndex(m => m.label === label);
          if (idx > -1) {
            MOCK_MARKET[idx].value = yData.price;
            MOCK_MARKET[idx].change = yData.change;
            MOCK_MARKET[idx].raw = yData.raw;
          }
        };

        if (apiData.market) {
          updateYahooItem("S&P 500", apiData.market.sp500);
          updateYahooItem("NASDAQ", apiData.market.nasdaq);
          updateYahooItem("VIX", apiData.market.vix);
          updateYahooItem("달러인덱스", apiData.market.dxy);
          updateYahooItem("달러/원", apiData.market.krw);
          updateYahooItem("WTI 원유", apiData.market.wti);
          updateYahooItem("금", apiData.market.gold);
        }
      }
    }
    if (section === 'prob' || !section) {
      MOCK_PROB = data.probability || [];
      if (apiData && apiData.polymarket) {
        const recIdx = MOCK_PROB.findIndex(p => p.title.includes('경기침체 진입') || p.title.includes('경기침체'));
        if (recIdx > -1) {
          MOCK_PROB[recIdx].yes = apiData.polymarket.recession.yes;
          MOCK_PROB[recIdx].no = apiData.polymarket.recession.no;
          MOCK_PROB[recIdx].src = "Polymarket";
        }

        const fedIdx = MOCK_PROB.findIndex(p => p.title.includes('금리 인하 횟수') || p.title.includes('기준금리 수준'));
        const fedObj = {
          type: "multi",
          title: "연준 2026년 금리 인하 횟수",
          outcomes: [
            { label: "0회 (동결)", pct: apiData.polymarket.fed_cuts_2026.zero },
            { label: "1회 (25bp)", pct: apiData.polymarket.fed_cuts_2026.one },
            { label: "2회 (50bp)", pct: apiData.polymarket.fed_cuts_2026.two }
          ],
          other: Math.max(0, 100 - (apiData.polymarket.fed_cuts_2026.zero + apiData.polymarket.fed_cuts_2026.one + apiData.polymarket.fed_cuts_2026.two)),
          src: "Polymarket"
        };

        if (fedIdx > -1) {
          MOCK_PROB[fedIdx] = fedObj;
        } else {
           MOCK_PROB.push(fedObj);
        }
      }
    }
    if (section === 'news' || !section) MOCK_NEWS = data.news || [];
    updateStatusBadge(lastMeta);
  } catch (e) {
    console.error('Data fetch error:', e);
    lastMeta = {
      status: 'fallback', updated_at: new Date().toISOString(),
      sources: [], providers: {}, errors: { fetch: 'seed or section fetch failed' }
    };
    updateStatusBadge(lastMeta);
  }
}

// FIX: 섹션별 reload — 스피너 상태 관리 + 캐시 히트 구분 + 타임스탬프 정확성
async function reloadSection(section) {
  const now = Date.now();
  const fromCache = CACHE[section] && (now - CACHE[section] < CACHE_TTL[section]);

  if (fromCache) {
    // 캐시 히트: 데이터는 그대로, 타임스탬프에 "(캐시)" 표시
    setTs(`ts-${section}`, new Date(CACHE[section]), true);
    return;
  }

  const btnId = `btn-${section}`;
  setBtnState(btnId, true);
  // FIX: 스켈레톤 표시
  const skeletonCount = section === 'market' ? 10 : section === 'prob' ? 6 : 6;
  showSkeleton(`${section}-grid`, skeletonCount);

  try {
    await simulateFetch(section);
    // FIX: fetch 완료 이후에 캐시 타임스탬프 기록 (원본은 fetch 전에 기록)
    CACHE[section] = Date.now();
    if (section === 'market') renderMarket();
    if (section === 'prob') renderProb();
    if (section === 'news') renderNews();
    setTs(`ts-${section}`, new Date(CACHE[section]), false);
  } finally {
    setBtnState(btnId, false);
  }
}

// FIX: 차트 전용 reload
async function reloadCharts() {
  setBtnState('btn-chart', true);
  await new Promise(r => setTimeout(r, 300));
  buildCharts();
  const now = new Date();
  setTs('ts-chart', now, false);
  setBtnState('btn-chart', false);
}

// FIX: reloadAll — 경쟁 조건 수정 + 모든 섹션 스피너 통합 처리
async function reloadAll() {
  const btnAll = document.getElementById('btn-all');
  btnAll.classList.add('spinning', 'loading');

  ['market', 'prob', 'news'].forEach(s => {
    setBtnState(`btn-${s}`, true);
    const count = s === 'market' ? 10 : 6;
    showSkeleton(`${s}-grid`, count);
  });

  // FIX: 각 섹션 캐시를 무효화 후 병렬 fetch
  CACHE.market = CACHE.prob = CACHE.news = 0;

  await Promise.all([
    simulateFetch('market'),
    simulateFetch('prob'),
    simulateFetch('news'),
  ]);

  // FIX: fetch 완료 후 타임스탬프 기록
  const now = Date.now();
  CACHE.market = CACHE.prob = CACHE.news = now;

  renderMarket();
  initInfoModal();
  renderProb();
  renderNews();
  buildCharts();

  const d = new Date(now);
  ['market', 'prob', 'news'].forEach(s => {
    setTs(`ts-${s}`, d, false);
    setBtnState(`btn-${s}`, false);
  });
  setTs('ts-chart', d, false);
  document.getElementById('ts-val').textContent = fmtTs(d);

  btnAll.classList.remove('spinning', 'loading');
}

// ────────── INIT ──────────
(async () => {
  ['market', 'prob', 'news'].forEach(s => {
    setBtnState(`btn-${s}`, true);
    showSkeleton(`${s}-grid`, s === 'market' ? 10 : 6);
  });
  setBtnState('btn-chart', true);

  await Promise.all([
    simulateFetch('market'),
    simulateFetch('prob'),
    simulateFetch('news'),
  ]);

  const now = Date.now();
  CACHE.market = CACHE.prob = CACHE.news = now;

  renderMarket();
  renderProb();
  renderNews();
  buildCharts();

  const d = new Date(now);
  ['market', 'prob', 'news'].forEach(s => {
    setTs(`ts-${s}`, d, false);
    setBtnState(`btn-${s}`, false);
  });
  setTs('ts-chart', d, false);
  setBtnState('btn-chart', false);
  document.getElementById('ts-val').textContent = fmtTs(d);
})();

// ────────── 전역 함수 노출 (HTML onclick 핸들러용) ──────────
window.reloadAll = reloadAll;
window.reloadSection = reloadSection;
window.reloadCharts = reloadCharts;
window.switchTab = switchTab;
