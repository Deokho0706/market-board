import json

path = 'c:/Users/admin/Desktop/market-board/data.json'

with open(path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Update timestamp
data["timestamp"] = "2026-03-21T00:18:33+09:00"

# Update Market
market_updates = {
    "S&P 500": {"value": "6,606.49", "change": "-0.30%", "raw": -0.30, "sub": "▼ 19.8pt"},
    "NASDAQ": {"value": "22,090.69", "change": "-0.30%", "raw": -0.30, "sub": "▼ 66.3pt"},
    "VIX": {"value": "24.82", "change": "+3.16%", "raw": 3.16, "sub": "경계 구간 진입"},
    "달러인덱스": {"value": "99.73", "change": "-0.57%", "raw": -0.57, "sub": "DXY"},
    "달러/원": {"value": "1,500.2", "change": "+0.05%", "raw": 0.05, "sub": "KRW/USD"},
    "WTI 원유": {"value": "$93.55", "change": "-1.50%", "raw": -1.5, "sub": "USD/배럴"},
    "금": {"value": "$4,710", "change": "-2.20%", "raw": -2.2, "sub": "USD/온스"},
    "미국 10Y": {"value": "4.37%", "change": "+0.11", "raw": 0.11, "sub": "장기금리 기준"},
    "장단기금리차": {"value": "-0.35%", "change": "", "raw": 0, "sub": "10Y-2Y · 역전 중"},
    "공포탐욕": {"value": "17", "change": "Extreme Fear", "raw": -30, "sub": "CNN Fear & Greed"}
}

for item in data["market"]:
    if item["label"] in market_updates:
        item.update(market_updates[item["label"]])

# Update Probability
for prob in data["probability"]:
    if "6월 FOMC" in prob["title"]:
        prob["yes"] = 14
        prob["no"] = 86
        prob["src"] = "CME FedWatch · 2026.03.21 기준"
    elif "최소 1회 인하" in prob["title"]:
        prob["yes"] = 55
        prob["no"] = 45
        prob["src"] = "CME FedWatch · 2026.03.21 기준"

# Update News 1 (The first item)
data["news"].insert(0, {
    "tag": "risk", "tagLabel": "리스크",
    "title": "중동 전쟁 여파로 유가 변동성 확대 및 주요 지수 하락 마감",
    "summary": "이스라엘-이란 분쟁 등 중동 지역의 지정학적 리스크가 고조되며 WTI 원유 가격이 100달러를 위협받았습니다. 유가 급등에 따른 인플레이션 장기화 우려로 S&P 500과 나스닥은 각각 0.3% 하락 마감했습니다.",
    "why": "유가 상승 발 인플레이션 우려로 연준 금리 인하 기대감 후퇴. 미국 10년물 금리 급등(4.37%).",
    "date": "2026.03.21"
})

# Remove the oldest news to maintain array length
if len(data["news"]) > 6:
    data["news"] = data["news"][:6]

with open(path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("data.json updated successfully")
