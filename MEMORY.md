# PlaceLink 프로젝트 메모리

최종 갱신: 2026-08-27

## 운영 상태

- 운영 사이트: `https://place-link.com`
- 운영 통합 기준 커밋: `d5d8d34` (PR #8 병합)
- 로그인 차단 변경은 필수 CI와 자동 Production 배포를 모두 통과했다.
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

1. 일정 데이터 스테이징의 관리자 검수·canonical 병합 API 구현
2. 문화포털·KOPIS 공급자 추가 및 영화관 공식 일정 링크 정책 적용
3. `KMA_SERVICE_KEY` 등록과 실응답 확인
4. 실제 사용자 ID 확인 후 `ADMIN_USER_IDS` 등록
5. OAuth 콜백, 행사 날짜, 데모 데이터, 모바일 핵심 흐름 최종 QA
6. 출시 승인 시에만 `AUTH_LOGIN_ENABLED=true` 설정 후 재배포

## 2026-08-27 개발 상태

- 장소·행사·코스의 출처와 콘텐츠 유형을 분리하는 일정 데이터 기반을 구현했다.
- 서울 열린데이터광장 문화행사 응답의 검증·정규화·원본 스테이징 명령을 추가했다.
- 장소 운영시간, 예외 휴무, 행사 회차, 공식 출처·예매 링크 저장 구조를 추가했다.
- 사용자 생성 코스는 신규 생성 시 `sourceType=UGC`로 기록한다.
- Docker Desktop의 오래된 Windows 통신 소켓 문제를 복구한 뒤 로컬 PostgreSQL을
  정상 기동했다. 신규 마이그레이션을 적용했으며 전체 Production 빌드도 통과했다.
  데이터베이스 단위 테스트 12개, 웹 단위 테스트 68개와 각 패키지 lint/typecheck가
  통과했다.

## 주의 사항

- 비밀번호와 전체 `DATABASE_URL`은 문서나 Git에 기록하지 않는다.
- Supabase DB 주소는 추정하지 말고 Connect 화면의 정확한 Transaction Pooler URI를
  사용한다.
- 상세 작업 기록과 장애 대응은 `docs/handoff-2026-08-26-final.md`를 기준으로 한다.
