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
  'S&P 500': {
    def: '미국 대형 상장기업 500개로 구성된 대표 주가지수입니다. 미국 증시 전반의 흐름을 가장 널리 보여주는 기준 지표 중 하나입니다.',
    current: '현재 지수는 최근 고점 대비 하락한 수준입니다. 단기 되돌림 구간으로 볼 수 있지만, 일반적으로 말하는 본격 조정은 보통 고점 대비 약 -10% 이상 하락한 경우를 뜻합니다.',
    context: 'S&P 500은 상승장에서도 -5% 안팎 하락이 자주 나타나며, -10% 수준의 조정도 반복적으로 발생합니다. 하락 자체보다 그 하락이 실적 둔화나 경기 악화로 이어지는지가 더 중요합니다.',
    implication: '기업 실적과 경기 확장 흐름이 유지된다면 하락은 분할매수 기회가 될 수 있습니다. 반대로 금리 부담, 실적 둔화, 유동성 축소가 겹치면 하락 폭이 더 커질 수 있습니다.',
    warn: '단기 하락만으로 추세 전환을 단정하지 마세요. 지수 수준뿐 아니라 실적 전망, 금리, 변동성, 신용시장 흐름을 함께 확인하는 것이 중요합니다.'
  },
  'NASDAQ': {
    def: '미국 기술·성장주 중심의 종합주가지수입니다. 애플, 마이크로소프트, 엔비디아, 아마존 등 대형 기술기업의 비중이 높아 금리 변화에 특히 민감하게 반응합니다.',
    current: '현재 지수는 최근 고점 대비 하락한 수준입니다. S&P 500보다 낙폭이 크게 나타나는 경우가 많으며, 이는 지수 내 성장주 비중이 높기 때문입니다.',
    context: '시가총액 상위 7개 기업(Magnificent 7)이 지수 전체의 약 40%를 차지합니다. 이들의 실적과 실적 가이던스가 지수 전체 방향에 큰 영향을 미칩니다.',
    implication: '금리가 높은 환경에서는 미래 수익을 현재가치로 할인하는 비율(DCF 할인율)이 높아져 성장주 밸류에이션에 부담이 커집니다. 금리 인하 기대가 커지면 반등 탄력도 가장 크게 나타나는 경향이 있습니다.',
    warn: '기술주 집중으로 섹터 편향이 심합니다. 개별 종목 리스크보다 섹터 전체의 순환매 흐름을 함께 확인하는 것이 중요합니다.'
  },
  'VIX': {
    def: 'CBOE 변동성 지수입니다. 향후 30일간 S&P 500의 예상 변동성을 옵션 가격에서 산출하며, 시장의 불안감을 수치화한 지표입니다.',
    current: '현재 20 이상으로 경계 구간에 진입해 있습니다. 시장 참여자들이 리스크 헤지 비용을 높이고 있으며, 단기 불확실성이 확대된 상태입니다.',
    context: 'VIX 12~15: 안정 | 15~20: 정상 | 20~30: 경계 | 30~40: 공포 | 40 이상: 극단 공포. 2020년 코로나 위기 당시 82.69까지 상승한 사례가 있습니다.',
    implication: 'VIX가 20을 넘으면 포트폴리오 리스크 관리를 점검할 필요가 있습니다. 과거 사례를 보면 VIX가 급등한 직후 1~3개월 내 주가가 반등하는 패턴이 자주 관찰됩니다.',
    warn: 'VIX 단독으로 매매 타이밍을 판단하지 마세요. 거래량, 풀투콜 비율, 신용 스프레드와 함께 종합적으로 판단하는 것이 중요합니다.'
  },
  '달러인덱스': {
    def: '주요 6개 통화(유로, 엔, 파운드, 캐나다 달러, 스웨덴 크로나, 스위스 프랑) 대비 미국 달러의 상대적 강도를 나타내는 지수입니다(DXY).',
    current: '현재 100 근방으로 달러 강세가 지속되고 있습니다. 미국 경제의 상대적 강세와 높은 금리가 달러 수요를 뒷받침하고 있습니다.',
    context: 'DXY 90 미만: 달러 약세 | 90~100: 보통 | 100~105: 강세 | 105 이상: 극단 강세. 2022년 9월에는 114.78까지 상승한 사례가 있습니다.',
    implication: '달러 강세는 신흥국 자산과 원자재 가격에 하락 압력을 줄 수 있습니다. 해외 자산에 투자하는 경우 환율 변동이 원화 환산 수익률에 직접 영향을 미칩니다.',
    warn: '달러와 주식이 항상 반대로 움직이지는 않습니다. 글로벌 위기 시에는 달러와 주식이 동반 하락하는 경우도 있으니 주의가 필요합니다.'
  },
  '달러/원': {
    def: '미국 달러 1당 한국 원화로 표시하는 환율입니다(KRW/USD). 숫자가 높을수록 원화 가치가 낮아집니다.',
    current: '현재 1,500원 근방으로 원화 약세가 지속되고 있습니다. 달러 강세와 외국인 자금 유출 압력이 복합적으로 작용하고 있습니다.',
    context: '1,200원 미만: 원화 강세 | 1,200~1,350원: 정상 범위 | 1,350~1,450원: 약세 경계 | 1,450원 이상: 심각한 약세. 2022년 10월 1,445원까지 상승한 사례가 있습니다.',
    implication: '원화 약세는 수출 기업 수익에 유리하지만, 수입 물가 상승과 외채 상환 부담 증가로 이어집니다. 해외 자산에 투자할 때는 환율 변동이 수익률에 직접 영향을 미칩니다.',
    warn: '외환당국의 시장 개입으로 단기 변동이 왜곡될 수 있습니다. NDF(역외 선물환) 시장 동향도 함께 확인하는 것이 유용합니다.'
  },
  'WTI 원유': {
    def: '서부 텍사스산 중질유를 기준으로 한 국제 원유 가격입니다(USD/배럴). 글로벌 에너지 비용과 인플레이션에 직접적인 영향을 미칩니다.',
    current: '현재 $90 이상으로 고유가 경계 구간에 있습니다. 중동 지정학적 긴장과 공급 차질 우려가 가격에 반영되어 인플레이션 재점화 우려가 커지고 있습니다.',
    context: '$60 미만: 저유가 | $60~80: 정상 | $80~100: 고유가 경계 | $100 이상: 경제 부담 구간. 2022년 러시아-우크라이나 전쟁 시에는 $130을 넘은 사례가 있습니다.',
    implication: '원유 가격 급등은 에너지 비용 상승 → 운송비 상승 → 전반적 물가 상승으로 이어집니다. 연준의 금리 인하 시기를 더 지연시킬 수 있습니다.',
    warn: '지정학적 이벤트로 단기 급변동이 빈번합니다. OPEC+ 감산 결정, 미국 전략비축유(SPR) 방출 등 정책 변수도 함께 확인하세요.'
  },
  '금': {
    def: '국제 금 현물 가격입니다(USD/트로이온스). 인플레이션 헤지, 지정학 위기 헤지, 중앙은행 외환보유고 자산으로 활용됩니다.',
    current: '현재 달러 강세와 실질금리 상승이 금 가격에 하락 압력을 주고 있습니다. 실질금리(명목금리 − 기대인플)와 금 가격은 역상관 관계를 보이는 경향이 있습니다.',
    context: '2024~2025년 중앙은행들의 금 매입이 사상 최대 수준을 기록했습니다. 달러 패권주의 대안으로 금을 선호하는 국가들이 늘어나고 있는 추세입니다.',
    implication: '금 하락은 위험자산 선호도 상승을 의미할 수 있지만, 단순 달러 강세에 의한 기계적 하락일 수도 있습니다. 장기적으로는 인플레이션 헤지 수단으로 활용됩니다.',
    warn: '단기 가격 변동에 민감하게 반응하지 마세요. 달러 강세 구간에는 금이 동반 하락할 수 있으며, 장기 보유 시에는 실질금리 추세를 함께 확인하는 것이 중요합니다.'
  },
  '미국 10Y': {
    def: '미국 정부가 발행한 10년 만기 국채의 수익률입니다. 주택담보대출, 회사채 등 장기 차입 비용의 기준이 되며, 시장의 장기 경제 전망을 반영합니다.',

    current: '현재 4% 중반대로 비교적 높은 수준을 유지하고 있습니다. 시장은 인플레이션이 어느 정도 통제되는 한편 연준의 금리 동결이 지속될 것으로 예상하고 있습니다.',
    context: '3.5% 미만: 완화적 | 3.5~4.5%: 중립 | 4.5% 이상: 긴축적. 금리가 오르면 기존 채권 가격은 하락하므로, 채권 편입 시점을 확인하는 것이 중요합니다.',
    implication: '금리 상승은 고PER 성장주의 밸류에이션을 압박하고 부동산 시장에 부담을 줍니다. 금리 하락은 성장주 반등과 주택 시장 회복에 유리하게 작용합니다.',
    warn: '금리 급등 시 주식시장 전반에 스트레스를 줄 수 있습니다. 특히 고PER 성장주에 민감하게 작용하므로, 주식과 채권을 함께 모니터링하세요.'
  },
  '미국 2Y': {
    def: '미국 정부가 발행한 2년 만기 국채의 수익률입니다. 연준의 금리 정책 기대치를 가장 빠르게 반영하는 지표로, 단기 통화정책 방향성을 파악하는 데 유용합니다.',
    current: '현재 4.7% 근방으로 높은 수준입니다. 시장이 연준의 금리 동결 또는 추가 인상 가능성을 반영하고 있습니다. FOMC 일정과 경제지표 발표에 따라 민감하게 움직입니다.',
    context: '2년물은 FOMC 발언과 경제지표 발표 직후 급변동하는 경우가 많습니다. 2년물이 10년물보다 높으면 역전 상태로, 이는 경기 둔화 신호로 해석됩니다.',
    implication: '2년물 금리가 하락하면 연준의 금리 인하 기대가 커지고 있다는 신호입니다. 이는 주식과 채권에 긍정적으로 작용하는 경향이 있습니다.',
    warn: 'FOMC 위원들의 발언 하나에 급변동할 수 있습니다. 단기 트레이딩보다는 중장기 추세 판단에 활용하는 것이 적합합니다.'
  },
  '장단기금리차': {
    def: '10년물 국채 수익률에서 2년물 수익률을 뺀 값입니다(10Y − 2Y). 이 값이 마이너스(-)면 역전 상태로, 경기침체의 선행 신호로 널리 활용됩니다.',
    current: '현재 역전 상태가 지속되고 있습니다. 단기 금리가 장기 금리보다 높아, 시장이 향후 경기 둔화를 예상하고 있다는 의미로 해석됩니다.',
    context: '역전은 지난 50년간 미국의 모든 경기침체를 선행했습니다. 다만 역전 후 실제 침체까지는 평균 12~18개월의 시차가 있어 단기 지표로는 한계가 있습니다.',
    implication: '역전이 해소되는 시점이 오히려 더 위험할 수 있습니다. 역전 해소는 보통 연준이 금리를 인하하기 시작할 때 발생하며, 이때 경기침체가 본격화되는 경우가 많았습니다.',
    warn: '역전 기간이 길어질수록 후속 충격이 커질 수 있습니다. 단독 지표로 판단하지 말고 실업률, PMI, 신용스프레드 등과 함께 확인하세요.'
  },
  '연준 기준금리': {
    def: '연방준비제도(Fed)가 설정하는 연방기금금리 목표 범위입니다. 모든 단기 금리의 기준이 되며, 시장 전반의 유동성과 차입 비용에 직접적인 영향을 미칩니다.',
    current: '현재 5.25~5.50%로 동결 중입니다. 2023년 7월 이후 동결이 지속되고 있으며, 시장은 2026년 하반기 첫 인하 가능성을 반영하고 있습니다.',
    context: '0~0.25%: 초완화 | 2~3%: 중립 | 4% 이상: 긴축 | 5% 이상: 강력 긴축. 현재 수준은 2001년 이후 최고치이며, ‘Higher for Longer’ 기조가 지속되고 있습니다.',
    implication: '높은 기준금리는 기업 차입 비용 증가, 소비 위축, 부동산 시장 압박으로 이어집니다. 인하 시작 시 주식과 채권의 동반 상승 가능성이 있습니다.',
    warn: '시장은 현재 금리보다 향후 금리 경로 기대에 더 민감하게 반응합니다. CME FedWatch의 확률 변화를 주시하는 것이 중요합니다.'
  },
  '공포탐욕': {
    def: 'CNN이 산출하는 시장 심리 지수입니다(0~100). 주가 모멘텀, 시장 강도, 거래 범위, 풀투콜 비율, 정크채 스프레드, VIX, 안전자산 수요 등 7개 지표를 종합합니다.',
    current: '현재 20 미만으로 Extreme Fear(극단 공포) 단계입니다. 시장 참여자들의 위험회피 심리가 극대화되어 있는 상태입니다.',
    context: '0~25: 극단 공포 | 25~45: 공포 | 45~55: 중립 | 55~75: 탐욕 | 75~100: 극단 탐욕. 과거 극단 공포 구간은 역발상 매수 기회와 겹치는 경우가 많았습니다.',
    implication: '공포 구간에서는 시장이 과도하게 비관적으로 평가되어 있을 가능성이 있습니다. 다만 공포가 더 심화될 수도 있으므로 분할 매수 등 단계적 접근이 유리합니다.',
    warn: '심리 지표 단독으로 매매 타이밍을 잡지 마세요. 펀더멘털(실적, 경제지표)과 함께 판단하는 보조 지표로 활용하세요.'
  },
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
      <div class="tip-row-label current">현재 상태</div>
      <div>${escHtml(tips.current)}</div>
    </div>
    <div class="tip-row">
      <div class="tip-row-label context">과거 패턴</div>
      <div>${escHtml(tips.context)}</div>
    </div>
    <div class="tip-row">
      <div class="tip-row-label hint">투자 시사점</div>
      <div>${escHtml(tips.implication)}</div>
    </div>
    <div class="tip-row">
      <div class="tip-row-label warn">유의사항</div>
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

  // 이벤트 위임 — market-grid 내 카드 전체 클릭
  document.getElementById('market-grid').addEventListener('click', e => {
    const card = e.target.closest('.mcard');
    if (card) {
      const trigger = card.querySelector('[data-tip-label]');
      if (trigger) { e.stopPropagation(); showTip(trigger); }
    }
  });

  // backdrop 클릭 닫힘
  document.getElementById('info-modal-backdrop').addEventListener('click', hideTip);

  // 외부 클릭 닫힘 (모달·카드 영역 제외)
  document.addEventListener('click', e => {
    if (!e.target.closest('#info-modal') && !e.target.closest('.mcard') && !e.target.closest('[data-tip-label]')) hideTip();
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
    const tipAttrs = tips
      ? `data-tip-label="${escHtml(item.label)}" aria-expanded="false" aria-controls="info-modal"`
      : '';
    const head = tips
      ? `<div class="mcard-head" ${tipAttrs} aria-label="${escHtml(item.label)} 상세 정보 보기">
    <div class="mcard-label">${escHtml(item.label)}</div>
  </div>`
      : `<div class="mcard-head"><div class="mcard-label">${escHtml(item.label)}</div></div>`;
    const d = document.createElement('div');
    d.className = `mcard ${cls} fade-in`;
    if (tips) d.style.cursor = 'pointer';
    d.innerHTML = `
  ${head}
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
      intersect: false
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: '#111318',
        borderColor: '#00d4aa', borderWidth: 1,
        titleColor: '#00d4aa', bodyColor: '#c8d0dc',
        titleFont: { family: 'IBM Plex Mono', size: 11, weight: '600' },
        bodyFont: { family: 'IBM Plex Mono', size: 12 },
        padding: 12,
        displayColors: false,
        callbacks: {
          title: function(context) {
            return context[0]?.label || '';
          },
          label: function(context) {
            const value = context.parsed.y;
            return '값: ' + value.toFixed(2);
          },
          afterLabel: function(context) {
            const dataIndex = context.dataIndex;
            const dataset = context.dataset.data;
            const currentValue = context.parsed.y;
            if (dataIndex > 0) {
              const prevValue = dataset[dataIndex - 1];
              const change = currentValue - prevValue;
              const changePercent = ((change / prevValue) * 100).toFixed(2);
              return '변화: ' + (change > 0 ? '+' : '') + change.toFixed(2) + ' (' + (changePercent > 0 ? '+' : '') + changePercent + '%)';
            }
            return '';
          }
        }
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
    if (section === 'market') {
      renderMarket();
      initInfoModal();
    }
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
async function initApp() {
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
}

// DOMContentLoaded 또는 즉시 실행
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// ────────── 전역 함수 노출 (HTML onclick 핸들러용) ──────────
window.reloadAll = reloadAll;
window.reloadSection = reloadSection;
window.reloadCharts = reloadCharts;
window.switchTab = switchTab;
