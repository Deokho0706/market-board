import json

path = 'c:/Users/admin/Desktop/market-board/data.json'

with open(path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# 1. Update timestamp
data["timestamp"] = "2026-03-21T00:35:16+09:00"

# 2. Update probability
data["probability"] = [
    {
      "type": "binary",
      "title": "연준 6월 FOMC — 금리 인하",
      "yes": 11, "no": 89,
      "src": "CME FedWatch · 2026.03.21 기준"
    },
    {
      "type": "binary",
      "title": "연준 2026년 내 최소 1회 인하",
      "yes": 49, "no": 51,
      "src": "CME FedWatch · 2026.03.21 기준"
    },
    {
      "type": "binary",
      "title": "미국 2026년 경기침체 진입",
      "yes": 34, "no": 66,
      "src": "Polymarket · 2026.03.21 기준"
    },
    {
      "type": "binary",
      "title": "2026년 S&P500 고점 대비 -20% 이상",
      "yes": 25, "no": 75,
      "src": "Polymarket · 2026.03.21 기준"
    },
    {
      "type": "multi",
      "title": "연준 첫 번째 금리 인하 시점",
      "outcomes": [
        { "label": "9월 2026", "pct": 45 },
        { "label": "11월 2026", "pct": 25 }
      ],
      "other": 30,
      "src": "CME FedWatch · 2026.03.21 기준"
    },
    {
      "type": "multi",
      "title": "2026년 말 기준금리 수준",
      "outcomes": [
        { "label": "5.25~5.50% (동결)", "pct": 51 },
        { "label": "5.00~5.25%", "pct": 36 }
      ],
      "other": 13,
      "src": "CME FedWatch · 2026.03.21 기준"
    }
]

# 3. Update news
data["news"] = [
    {
      "tag": "risk", "tagLabel": "리스크",
      "title": "중동 지정학적 위기 고조로 국제유가 요동",
      "summary": "방어 및 공격 행위가 교차하는 가운데 중동 지역 갈등 여파로 WTI 등 국제유가가 90달러선을 돌파하며 인프라 타격 우려가 시장 변동성을 키우고 있습니다.",
      "why": "에너지 발 인플레이션 우려 고조로 연준 금리 인하 사이클이 통째로 지연될 가능성.",
      "date": "2026.03.21"
    },
    {
      "tag": "macro", "tagLabel": "거시",
      "title": "미국 주간 신규 실업수당 청구 20.8만건으로 감소",
      "summary": "미 노동부가 발표한 주간 신규 실업수당 청구 건수가 전주 대비 8,000건 감소한 20만 8,000건을 기록하며 견조한 미 고용 시장의 체력을 재확인했습니다.",
      "why": "탄탄한 고용이 '노 랜딩(No Landing)' 시나리오를 지지하며 조기 금리 인하 명분 축소.",
      "date": "2026.03.21"
    },
    {
      "tag": "fed", "tagLabel": "연준",
      "title": "시장, 미 연말 기준금리 동결 전망 절반(51%) 상회",
      "summary": "CME 페드워치에 따르면, 올 12월 FOMC 이후에도 기준금리가 동결(5.25~5.50%)될 것이란 확률이 지난주 23.5%에서 금일 51.3%로 크게 치솟았습니다.",
      "why": "경제 지표 호조와 물가 부담 지속으로 연준의 'Higher for Longer' 스탠스 장기화 예측.",
      "date": "2026.03.21"
    },
    {
      "tag": "risk", "tagLabel": "리스크",
      "title": "미 주요 3대 지수 하락 마감, 4주 연속 약세 지속",
      "summary": "미 10년물 국채 금리가 장중 4.37%를 돌파하고 거시 불확실성이 겹침에 따라 S&P 500과 나스닥이 나란히 0.3% 이상 하락하는 등 위험 자산 회피 심리가 발동했습니다.",
      "why": "채권 금리 급등이 기업 이익과 증시 밸류에이션 부담을 가중시키며 주가 하방 압력으로 작용.",
      "date": "2026.03.21"
    },
    {
      "tag": "macro", "tagLabel": "거시",
      "title": "미 1월 신규 주택 판매 건수 17.6% 급감",
      "summary": "미국 신규 주택 판매 실적이 전월비 17% 이상 하락하여 2013년 이후 최대폭의 낙폭을 기록했습니다. 모기지 금리 부담이 수요를 제한하고 있습니다.",
      "why": "건설/부동산 경기 둔화가 실물 경제의 취약 고리로 작용할 가능성에 시장 주목.",
      "date": "2026.03.21"
    },
    {
      "tag": "policy", "tagLabel": "정책",
      "title": "영국 및 유럽 주요 중앙은행(BoE·ECB) 금리 동결 유지",
      "summary": "영란은행(BoE)과 유럽중앙은행(ECB)이 인플레이션 불확실성과 에너지 가운 상승 우려를 들어 일제히 핵심 정책 금리를 동결하기로 결정했습니다.",
      "why": "미 연준 뿐 아니라 글로벌 주요 중앙은행들이 통화 완화(Pivot)에 동반 신중 모드 유지.",
      "date": "2026.03.21"
    }
]

with open(path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("data.json updated successfully")
