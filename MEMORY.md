# PlaceLink 프로젝트 메모리

최종 갱신: 2026-08-26

## 운영 상태

- 운영 사이트: `https://place-link.com`
- 운영 통합 기준 커밋: `8f5acf0`
- 로그인 차단 변경: `codex/pause-production-login`, 커밋 `4e7d92a`
- 로그인 차단 변경은 필수 CI를 통과한 PR로 `main`에 병합해야 한다.
- Production 로그인은 `AUTH_LOGIN_ENABLED=true`일 때만 열리도록 구현했다.
- 별도 Production 배포로 로그인 차단이 현재 운영에 반영됐으며, 로그인 API 503,
  세션 API 200/null, 내 페이지·만들기 페이지의 안내 문구를 확인했다.

## 완료 사항

- 홈 연속 피드, 기상청/시간 개인화, 지도 연결, 명예의 전당, 관리자 행사 앵커,
  1~3일 코스 플래너 통합
- 전체 검사: DB 7, 웹 68, Playwright 8, lint/typecheck/build 통과
- Supabase 운영 DB 다일 코스 마이그레이션 적용 및 검증
- Gabia 루트 A 레코드 `76.76.21.21`, Vercel 인증서와 HTTPS 확인

## 다음 우선순위

1. 로그인 차단 브랜치 PR 생성 → CI → `main` 병합 → 운영 확인
2. `KMA_SERVICE_KEY` 등록과 실응답 확인
3. 실제 사용자 ID 확인 후 `ADMIN_USER_IDS` 등록
4. OAuth 콜백, 행사 날짜, 데모 데이터, 모바일 핵심 흐름 최종 QA
5. 출시 승인 시에만 `AUTH_LOGIN_ENABLED=true` 설정 후 재배포

## 주의 사항

- 비밀번호와 전체 `DATABASE_URL`은 문서나 Git에 기록하지 않는다.
- Supabase DB 주소는 추정하지 말고 Connect 화면의 정확한 Transaction Pooler URI를
  사용한다.
- 상세 작업 기록과 장애 대응은 `docs/handoff-2026-08-26-final.md`를 기준으로 한다.
