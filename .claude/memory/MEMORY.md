[Vite 구조]

- root: src 사용
- 진입점: src/index.html
- 빌드 결과: dist/

[데이터 구조]

- seed.json 위치: public/data/seed.json
- fetch 경로: /data/seed.json (절대경로)

[검증 방식]

- 모든 변경 후 dev/build 확인
- build 결과 기준으로 판단

[현재 상태]

- Step 1 완료 (package.json 정리)
- Step 2 완료 (seed.json 구조 수정)
- 루트 index.html 제거됨 (사용되지 않음)
