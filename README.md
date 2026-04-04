# MARKET·BOARD

예측시장(Polymarket) + 거시지표(FRED/Yahoo Finance) 모니터링 대시보드

## 주요 기능

- **경제 위험도 점수** (0~100): VIX, 장단기금리차, 침체확률, 공포탐욕, 기대인플레 합산
- **시장 지표 카드**: S&P 500, NASDAQ, VIX, 한국 증시(코스피·코스닥), 환율, 금리, 원자재
- **예측시장 확률**: Polymarket 기반 경기침체·금리 인하 확률
- **AI 뉴스 자동화**: DeepSeek API로 지표 기반 한국어 뉴스 자동 생성
- **AI 해설 코멘트**: 위험도 점수에 대한 1~2줄 투자 시사점

## 설치 및 실행

```bash
npm install
npm run dev      # 개발 서버 (localhost:5173)
npm run build    # 프로덕션 빌드 (dist/)
```

## 환경변수 설정

```bash
cp .env.example .env.local
```

`.env.local` 파일을 열고 아래 값을 채웁니다:

| 변수 | 필수 | 설명 |
|------|------|------|
| `FRED_API_KEY` | ✅ 필수 | FRED 거시지표 조회 (무료) |
| `DEEPSEEK_API_KEY` | 선택 | AI 뉴스·해설 생성 (없으면 seed fallback) |

### FRED API Key 발급
1. https://fred.stlouisfed.org/docs/api/api_key.html 접속
2. 무료 계정 생성 후 API Key 발급

### DeepSeek API Key 발급
1. https://platform.deepseek.com 접속
2. 계정 생성 후 API Key 발급

## Vercel 배포

```bash
vercel deploy
```

Vercel 대시보드 → Settings → Environment Variables에서 위 두 변수를 추가합니다.

## 데이터 소스

| 소스 | 제공 데이터 |
|------|------------|
| Yahoo Finance | S&P 500, NASDAQ, VIX, 코스피, 코스닥, 환율, 원자재 |
| FRED | 미국 국채금리, 기준금리, 미시건대 기대인플레 |
| Polymarket | 경기침체·금리 인하 확률 |
| DeepSeek | 뉴스 자동 생성, 위험도 해설 |

## 기술 스택

- **프론트엔드**: Vite + Vanilla JS + Chart.js
- **백엔드**: Vercel Serverless Functions
- **배포**: Vercel
