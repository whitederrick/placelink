# place-link

MZ세대 커플 데이트 코스 UGC 플랫폼 (Next.js 풀스택 모바일 웹, ko/en).

## 기준 문서 (반드시 준수)

1. **[docs/place-link_product_baseline.md](docs/place-link_product_baseline.md)** — 제품 정본. "무엇을 만드는가"(기능 명세, 우선순위, 백로그).
2. **[docs/place-link_architecture_baseline.md](docs/place-link_architecture_baseline.md)** — 아키텍처 정본. "어떻게 만드는가"(구조·스택·단계).
3. **[docs/place-link_development_guide.md](docs/place-link_development_guide.md)** — 개발 규칙집. 모든 규칙은 ID(예: `SEC-3`)로 참조.
4. `docs/legacy/`의 문서들은 **참고 자료일 뿐, 결정의 근거가 아니다.** 유효한 기획은 이미 product_baseline에 추출되어 있고, 기술 제안(6개 앱, NestJS 등)은 채택되지 않았다. 충돌 시 위 세 문서가 우선.

product_baseline 7.4의 백로그 기능(AI 코스 생성, 예약/결제, 파트너 등)은 지시가 있어도 ADR 작성 후에만 착수한다.

작업 유형별로 착수 전 가이드의 해당 섹션을 반드시 읽는다: 스키마 변경 → QRY/INT/IMP/REG-4, API 추가 → DATA/SEC, 새 feature → ARCH/PROD-4, 운영 기능 → AGT.

## 절대 규칙 (MUST 요약)

- **계층**: presentation → service → data 단방향. UI에서 Prisma 직접 import 금지 (ARCH-2). `features/*/service.ts`는 Next.js API(`cookies()`, `NextRequest` 등) 사용 금지 — Actor를 파라미터로 주입 (ARCH-3). feature 간 직접 import 금지, `index.ts` public API만 (ARCH-4).
- **외부 서비스**(지도/번역/스토리지/LLM)는 `lib/adapters/` 인터페이스 경유. SDK 직접 import 금지 (ARCH-5).
- **데이터 호출**: Server Component는 service 직접 호출(자기 API fetch 금지, DATA-1). 클라이언트 동적 데이터는 TanStack Query (DATA-2). **변이는 `/api/v1/*` Route Handler만 — Server Action 금지** (DATA-3).
- **검증**: 모든 외부 입력은 `features/*/schema.ts`의 Zod 스키마 파싱 후 사용 (DATA-4, SEC-2). 모든 핸들러는 `withApiHandler({ auth })` 래퍼 + 명시적 인증 선언 (SEC-1). 리소스 접근 시 소유권 검증 (SEC-3).
- **쿼리**: `select` 명시 (QRY-1), 루프 내 쿼리 금지 (QRY-2), 다중 테이블 쓰기는 `$transaction` (QRY-3), 목록은 cursor pagination take≤50 (QRY-4), raw SQL은 PostGIS 한정·파라미터 바인딩·`queries.ts` 안에서만 (QRY-5).
- **스키마 변경**: Expand–Contract 3단계, 마이그레이션 파일 수정 금지 (REG-4). 새 조회 패턴에는 인덱스 검토 동반 (QRY-6).
- **운영 행위**는 service + `/api/v1/admin/*`로 먼저 구현, admin UI는 껍데기 (ARCH-6). 모든 운영 행위는 AuditLog 기록, actorType HUMAN/AGENT 구분 (AGT-4).
- **타입**: strict, `any`/`@ts-ignore` 금지 (CON-1). env는 `lib/env.ts` 경유, `process.env` 직접 접근 금지 (CON-4).
- **행동 이벤트**: 핵심 사용자 행동(조회/스크랩/공유/필터/마법사 진행)은 `lib/analytics/track()` + 이벤트 카탈로그로만 기록 (ANL-1/2). 태그는 자유 문자열 금지, 관리형 Tag 테이블 참조 (ANL-5).
- **TODO 주석 금지** — 이슈로 등록 (PROD-10).

## 워크플로

1. **착수 전 (DoR, PROD-1)**: 스키마 변경분 + API 계약(Zod) + 화면 상태 흐름을 먼저 확정. UI부터 만들지 않는다.
2. **새 feature**: PROD-4의 표준 구조(schema/service/queries/components/hooks/index)를 그대로 복제. 임의 변형 금지.
3. **만들기 전 검색** (PROD-3): 유틸/컴포넌트/스키마 신규 작성 전 기존 코드 grep.
4. **버그 수정**: 재현하는 실패 테스트 먼저 작성 (REG-5).
5. **완료 전**: `pnpm verify` 통과 + 신규 로직 테스트 + PR 템플릿 작성 (ENF-3).
6. **커밋**: Conventional Commits `feat|fix|refactor|test|docs|chore(scope): 요약` (PROD-5).
7. 규칙이 부적절하다고 판단되면 무시하지 말고 ADR(`docs/adr/`)을 제안한다 (ENF-4). 기술 결정·구조 변경도 ADR로 기록 (PROD-6).

## 명령어 (0단계 스캐폴드 후 유효)

- `pnpm verify` — lint + typecheck + test (PR 전 필수)
- `pnpm db:seed` — 표준 개발 데이터 재현
