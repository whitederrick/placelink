# PlaceLink 프로젝트 메모리

최종 갱신: 2026-08-27 (Asia/Seoul)

## 현재 정본

- 최신 상세 인수인계: `docs/handoff-2026-08-27-studio-operations.md`
- 브랜치: `codex/schedule-data-foundation`
- 기능 구현 기준 커밋: `106471a`
- 운영 사이트: `https://place-link.com`
- Studio: `https://place-link.com/ko/studio`
- 운영 배포: `dpl_59skPL4ezHeUQZ7fapRZu7yUDQ3X`
- 운영 DB migration `20260827200000_add_ingestion_runs` 적용 완료
- 문서 갱신 전 코드 작업 디렉터리는 clean이었다.

## 완료

- 사용자 생성 장소·코스와 외부 수집 콘텐츠를 구분하는 출처·유형 기반
- 장소 운영시간·예외 휴무, 행사 기간·회차, 공식·예매 링크 저장 기반
- 서울시 문화행사와 문화포털 `/cultureinfo/period2` 수집
- XML 검증, 페이지네이션, 공급자 실패 보고, 정기 cron
- `IngestionRun` 실행 이력과 `IngestionRecord` 연결, 성공·실패 감사로그
- Studio 공통 셸, 운영 대시보드, 수집 실행 목록·상세, 관리자 API
- 운영 플랫폼 전체 IA와 제휴·쿠폰·수익모델 구축 순서 정의
- Production 전용 migration 실행 절차 자동화
- 타입·린트·86개 테스트·Production 빌드 통과
- 운영 Studio 200, 비로그인 관리자 API 401, 수집 cron 200 확인

## 바로 다음 할 일

1. 현재 브랜치 PR 생성, 필수 CI 통과, 리뷰 후 main 병합
2. main 기준 Production 재확인
3. 운영자 로그인 상태에서 Studio 대시보드·실행 목록·상세 시각 QA
4. 정기 cron 실행이력이 계속 누적되는지 확인
5. Preview DB와 Production DB 분리 정책 확정
6. 사용자 목록·상세와 문의·불만·신고 관리 구현
7. 장소·행사·코스 목록·상세 및 공개·만료·중복 관리 구현
8. 운영자 세부 역할·권한과 감사로그 조회 구현
9. 수집 부분 성공·재시도·변경·검증 실패·장애 알림 고도화
10. 파트너 → 쿠폰·캠페인 → 성과 추적 순으로 확장
11. 결제·환불·정산은 ADR과 법률·세무·보안 검토 이후 구현

## 중요한 제약

- 최근 15분 활동은 실시간 접속자 수가 아니라 분석 이벤트 수다.
- 현재 공급자 상태 관제는 서울시·문화포털 중심이다.
- 앱 쿼리는 Supabase Transaction Pooler 6543, migration은 Session Pooler 5432를
  사용한다.
- 현재 브랜치는 main이 아니므로 병합 완료로 간주하지 않는다.
- 비밀값과 전체 DB URL은 문서나 Git에 기록하지 않는다.
