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

// ────────── RENDER ──────────
function renderMarket() {
  const g = document.getElementById('market-grid');
  g.innerHTML = '';
  MOCK_MARKET.forEach(item => {
    const cls = item.raw > 0 ? 'up' : item.raw < 0 ? 'down' : 'neutral';
    const chg = item.change
      ? `<div class="mcard-change ${cls}">${item.change}</div>` : '';
    const d = document.createElement('div');
    d.className = `mcard ${cls} fade-in`;
    d.innerHTML = `
  <div class="mcard-label">${item.label}</div>
  <div class="mcard-value">${item.value}</div>
  ${chg}
  <div class="mcard-sub">${item.sub}</div>`;
    g.appendChild(d);
  });
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
    try {
      const apiRes = await fetch('/api/dashboard');
      if (apiRes.ok) apiData = await apiRes.json();
    } catch(err) {
      console.error('API error:', err);
    }

    if (section === 'market' || !section) {
      MOCK_MARKET = data.market || [];
      if (apiData) {
        const updateFredItem = (label, value) => {
          const idx = MOCK_MARKET.findIndex(m => m.label === label);
          if (idx > -1) {
            MOCK_MARKET[idx].value = value + "%";
            MOCK_MARKET[idx].change = "LIVE";
            MOCK_MARKET[idx].sub = "FRED 실시간";
            MOCK_MARKET[idx].raw = 0; // neutral class
          } else {
            MOCK_MARKET.push({
              label, value: value + "%", change: "LIVE", raw: 0, sub: "FRED 실시간"
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
            if (!MOCK_MARKET[idx].sub.includes('LIVE')) {
              // sub 라벨 텍스트에 LIVE 추가
              MOCK_MARKET[idx].sub += " · LIVE";
            }
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
          MOCK_PROB[recIdx].src = "Polymarket · LIVE";
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
          src: "Polymarket · LIVE"
        };

        if (fedIdx > -1) {
          MOCK_PROB[fedIdx] = fedObj;
        } else {
           MOCK_PROB.push(fedObj);
        }
      }
    }
    if (section === 'news' || !section) MOCK_NEWS = data.news || [];
  } catch (e) {
    console.error('Data fetch error:', e);
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
  document.getElementById('ts-val').textContent = fmtTs(d);
})();

// ────────── 전역 함수 노출 (HTML onclick 핸들러용) ──────────
window.reloadAll = reloadAll;
window.reloadSection = reloadSection;
window.reloadCharts = reloadCharts;
window.switchTab = switchTab;
