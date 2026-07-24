# place-link 개발 가이드 (Engineering Guide) v1.0

## 0. 문서 위상 및 준용 원칙

- 이 문서는 place-link의 **모든 개발 작업에 우선 적용되는 규칙집**이다.
- 아키텍처 구조는 [place-link_architecture_baseline.md](place-link_architecture_baseline.md)를 따른다. 두 문서가 기존 문서(detailed/advanced/ultimate/development_architecture)와 충돌하면 **이 두 문서가 우선**한다. 기존 문서는 참고 자료로만 사용한다.
- 모든 규칙은 ID를 가진다 (예: `SEC-3`). 코드 리뷰, PR, 커밋 메시지에서 규칙 ID로 참조한다.
- 규칙 등급:
  - **MUST**: 위반 시 머지 불가. 예외 없음.
  - **SHOULD**: 원칙적으로 준수. 예외 시 PR에 사유를 명시.
- 규칙의 추가/변경/삭제는 `docs/adr/`에 ADR(Architecture Decision Record)을 작성한 후에만 가능하다. 코드 리뷰 중 "이 규칙이 틀렸다"고 판단되면 규칙을 무시하지 말고 ADR을 제안한다.

---

## 1. 코드 컨벤션 (CON)

### CON-1. TypeScript 엄격 모드 [MUST]
- `strict: true`, `noUncheckedIndexedAccess: true` 고정.
- `any` 사용 금지. 타입을 모르면 `unknown`으로 받고 narrowing 후 사용.
- `as` 단언은 외부 라이브러리 경계에서만 허용하고 사유 주석을 남긴다.
- `@ts-ignore` 금지. 불가피하면 `@ts-expect-error` + 사유.

### CON-2. 네이밍 규칙 [MUST]

| 대상 | 규칙 | 예시 |
|---|---|---|
| 변수/함수 | camelCase, 동사+명사 | `createCourse`, `nearbyPlaces` |
| boolean | `is/has/can/should` 접두 | `isPublished`, `hasCoupon` |
| 상수 | UPPER_SNAKE_CASE | `MAX_NODES_PER_COURSE` |
| 타입/인터페이스 | PascalCase, 접두 `I`/`T` 금지 | `CourseDraft`, `PlaceSearchQuery` |
| React 컴포넌트 | PascalCase | `CourseWizard` |
| 이벤트 핸들러 | 내부 `handleX`, prop `onX` | `handleSubmit`, `onNodeAdd` |
| Zod 스키마 | `xxxSchema`, 추론 타입은 `z.infer` | `createCourseSchema` |
| 커스텀 훅 | `useXxx` | `useCourseBuilder` |
| async 함수 | 동사로 시작 (Get 접두 지양) | `fetchNearbyPlaces` |

- 축약어는 승인 목록만 사용: `id`, `url`, `api`, `db`, `i18n`, `lat`, `lng`. 그 외 축약 금지 (`crs`, `usr` 등 불가).
- 파일명: 컴포넌트는 `PascalCase.tsx`, 그 외 모두 `kebab-case.ts`.

### CON-3. DB 네이밍 규칙 [MUST]
- Prisma model: PascalCase 단수 (`Course`), 테이블은 `@@map("courses")` snake_case 복수.
- 컬럼: 코드에서 camelCase, DB는 `@map("created_at")` snake_case.
- FK 필드는 `{참조모델}Id` (`coupleId`), 관계 필드는 참조 모델명 소문자 (`couple`).
- 시간 컬럼은 `~At` 접미 (`publishedAt`), boolean 컬럼은 `is~` 접두.

### CON-4. 환경 변수 [MUST]
- UPPER_SNAKE_CASE. 서버 전용 키에 `NEXT_PUBLIC_` 접두 금지.
- 모든 env는 `lib/env.ts`에서 Zod 스키마로 기동 시 검증한다. `process.env` 직접 접근 금지 — `env` 객체만 사용.

### CON-5. 매직 넘버/문자열 금지 [SHOULD]
- 의미 있는 수치·문자열은 상수로 추출한다. 두 곳 이상에서 쓰이면 MUST.

### CON-6. 주석 규칙 [SHOULD]
- 주석은 "왜"만 기록한다 (제약, 정책적 이유, 외부 API 특이사항). "무엇"을 설명하는 주석 금지 — 코드로 표현한다.

### CON-7. 포맷 자동화 [MUST]
- Prettier + ESLint 설정은 `packages/config`에 단일 정의. 개별 앱에서 오버라이드 금지.
- 포맷 논쟁은 하지 않는다 — 도구 출력이 정답이다.

### CON-8. UI 문구는 번역 키 경유 [MUST]
- 사용자에게 보이는 모든 문구는 next-intl 번역 키로 관리한다. JSX 내 하드코딩 문구 금지 (ko/en Day 1 요건).
- 키 네이밍: `{feature}.{screen}.{key}` (예: `courses.wizard.addPlace`).
- 로그·에러 코드 등 내부 문자열은 대상이 아니다.

---

## 2. 아키텍처 경계 (ARCH)

### ARCH-1. 3계층 고정 [MUST]
```text
presentation (app/, components/)   → HTTP/화면. 파싱과 렌더만.
service      (features/*/service.ts) → 비즈니스 로직. 프레임워크를 모른다.
data         (features/*/queries.ts) → Prisma/DB 접근.
```
- 상위 → 하위 방향으로만 의존한다. 역방향 import 금지.

### ARCH-2. UI에서 Prisma 직접 접근 금지 [MUST]
- `app/`, `components/`, `widgets/` 어디에서도 `@prisma/client`, `packages/database`를 직접 import하지 않는다. 반드시 service를 경유한다.

### ARCH-3. service 계층의 프레임워크 독립 [MUST]
- `service.ts`에서 `next/*`, `cookies()`, `headers()`, `NextRequest` 사용 금지.
- 인증 컨텍스트는 파라미터(`actor: Actor`)로 주입받는다.
- 이 규칙이 향후 API 서버 분리와 에이전트 도구화를 가능하게 하는 핵심이다.

### ARCH-4. feature 간 직접 import 금지 [MUST]
- `features/courses`에서 `features/places/queries.ts`를 직접 import하지 않는다.
- feature가 외부에 제공할 것은 `features/{name}/index.ts`(public API)로만 노출한다.
- 두 feature가 공유하는 코드는 `lib/shared/`로 승격한다.

### ARCH-5. 외부 서비스는 Adapter 경유 [MUST]
- 지도, 번역, 스토리지, LLM은 `lib/adapters/`의 인터페이스(`PlaceSearchProvider`, `TranslationProvider`, `CourseGenerator` 등)를 통해서만 호출한다.
- feature 코드에 카카오/구글/OpenAI SDK 직접 import 금지.

### ARCH-6. 운영 행위는 API 우선 [MUST]
- 모든 운영/관리 행위(블라인드, 병합, 제재, 앵커 지정, 번역 오버라이드)는 **service 함수 + `/api/v1/admin/*` 엔드포인트를 먼저** 만들고, admin UI는 그것을 호출하는 껍데기로 만든다.
- UI에서만 가능한 운영 행위가 존재하면 안 된다 (에이전트 도구화 전제).

---

## 3. 데이터 호출 방식 (DATA)

### DATA-1. Server Component 조회는 service 직접 호출 [MUST]
- Server Component에서 자기 자신의 `/api`를 `fetch`하지 않는다. `features/*/service.ts`를 직접 호출한다.

### DATA-2. 클라이언트 동적 데이터는 TanStack Query [MUST]
- 클라이언트에서 필요한 동적 조회(지도 주변 장소, 무한 스크롤 피드)는 TanStack Query + `/api/v1/*` 조합만 사용한다. `useEffect` + `fetch` 수동 조합 금지.
- Query Key 규칙: `[feature, entity, params]` 형태. 예: `['places', 'nearby', { lat, lng, radius }]`.

### DATA-3. 변이(Mutation)는 Route Handler로 통일 [MUST]
- 생성/수정/삭제는 모두 `/api/v1/*` Route Handler로 구현한다. **Server Action 사용 금지.**
- 이유: API 계약을 단일화해야 에이전트·향후 모바일 앱·API 분리가 같은 계약을 재사용할 수 있다.

### DATA-4. 입출력 스키마 단일 소스 [MUST]
- 모든 API의 요청/응답 스키마는 `features/{name}/schema.ts`에 Zod로 정의한다.
- 서버 검증과 클라이언트 폼 검증이 **같은 스키마 객체**를 import한다. 중복 정의 금지.

### DATA-5. 표준 응답 포맷 [MUST]
```ts
// 성공
{ "data": <T>, "meta"?: { "nextCursor"?: string } }
// 실패
{ "error": { "code": "COURSE_NOT_FOUND", "message": "..." } }
```
- 에러 코드는 `lib/errors.ts`의 enum에 등록된 값만 사용한다.

### DATA-6. 에러 처리 표준 [MUST]
- service는 `AppError(code, message, status)`만 throw한다. Route Handler 공통 래퍼가 이를 표준 응답으로 변환한다.
- 핸들러마다 개별 try-catch로 포맷을 만들지 않는다 — 공통 `withApiHandler()` 래퍼를 사용한다.
- 예상 가능한 실패(중복, 권한 없음)는 에러 코드로, 예상 불가 실패는 500 + 로깅.

### DATA-7. 캐싱 선언 의무 [SHOULD]
- 모든 페이지/핸들러는 캐싱 전략을 명시한다: 공개 콘텐츠(코스 상세, 피드)는 ISR/캐시, 개인화 데이터(마이페이지)는 `no-store`.
- "기본값이라 안 적음"을 금지 — 의도를 코드에 드러낸다.

---

## 4. 쿼리 기준 (QRY)

### QRY-1. select 명시 [MUST]
- Prisma 조회 시 `select` 또는 명시적 `include`를 반드시 지정한다. 전체 컬럼 암묵 조회 금지.
- 응답에 불필요한 컬럼(내부 플래그, 타 유저 정보)이 실려 나가는 사고를 원천 차단한다.

### QRY-2. 루프 내 쿼리 금지 (N+1) [MUST]
- `for`/`map` 안에서 `await prisma.*` 금지. `include`, `where: { id: { in: [...] } }`, groupBy로 해결한다.

### QRY-3. 다중 쓰기는 트랜잭션 [MUST]
- 두 개 이상의 테이블에 쓰는 작업(코스 + 노드 생성, 쿠폰 발급 + 수량 차감)은 반드시 `prisma.$transaction`으로 묶는다.

### QRY-4. 목록 조회 규칙 [MUST]
- 모든 목록 API는 cursor 기반 pagination. `take` 상한 50 (기본 20).
- `offset` pagination은 admin 내부 화면에만 허용.

### QRY-5. Raw SQL 격리 [MUST]
- `$queryRaw`는 PostGIS 공간 쿼리 등 Prisma로 불가능한 경우에만, 반드시 파라미터 바인딩으로, `features/*/queries.ts` 안에서만 사용한다. 문자열 조립 SQL 금지.

### QRY-6. 인덱스 동반 원칙 [MUST]
- 새로운 조회 패턴(where/orderBy 조합)을 추가하는 PR은 해당 인덱스 추가 여부를 검토하고 결과를 PR에 명시한다. 위치 검색은 PostGIS GIST 인덱스를 사용한다.

### QRY-7. 카운터는 파생 데이터 [SHOULD]
- `viewCount`, `scrapCount` 같은 집계 컬럼은 원본(Scrap 테이블 등)에서 **재계산 가능**해야 한다. 원본 없이 카운터만 증가시키는 설계 금지.

### QRY-8. Soft Delete 정책 [MUST]
- soft delete는 복원이 필요한 도메인(Course, User)에만 명시적으로 적용한다. 적용 도메인은 조회 헬퍼(`whereActive()`)를 통해 기본 필터링하고, 전 테이블 일괄 적용은 금지한다.

---

## 5. 회귀 방지 (REG)

### REG-1. service 단위 테스트 의무 [MUST]
- 비즈니스 규칙이 있는 service 함수(코스 발행 조건, 쿠폰 발급, 권한 판정)는 단위 테스트를 동반한다. 단순 위임 함수는 제외.

### REG-2. 핵심 플로우 E2E 스모크 [MUST]
- 다음 플로우는 Playwright 스모크 테스트를 유지하고 CI에서 실행한다: 로그인 → 코스 생성 → 발행 → 상세 조회 → 스크랩 → 공유 URL 접근.
- 이 목록의 변경은 ADR로 관리한다.

### REG-3. CI 게이트 [MUST]
- `lint` + `typecheck` + `test` + `build` 전체 통과 없이 main 머지 불가. 로컬 동일 명령: `pnpm verify`.

### REG-4. 마이그레이션은 Expand–Contract [MUST]
- 스키마 변경은 (1) 추가 배포 → (2) 코드 전환 → (3) 제거 배포의 3단계로 나눈다. 컬럼 rename/drop을 코드 변경과 같은 배포에 싣지 않는다.
- 마이그레이션 파일은 수정하지 않는다 — 잘못되면 새 마이그레이션으로 정정한다.

### REG-5. 버그 수정은 재현 테스트 먼저 [MUST]
- 버그 수정 PR은 그 버그를 재현하는 실패 테스트를 먼저 추가하고, 수정으로 통과시킨다.

### REG-6. 공용 코드 변경 시 사용처 전수 확인 [MUST]
- `lib/`, `packages/` 변경 시 모든 사용처를 grep으로 확인하고, 영향받는 feature를 PR에 나열한다.

---

## 6. 보안 (SEC)

### SEC-1. 기본 거부 (Deny by Default) [MUST]
- 모든 `/api/v1/*` 핸들러는 명시적으로 인증/인가를 선언한다. `withApiHandler({ auth: 'user' | 'admin' | 'public' })` — 선언 없는 핸들러는 lint로 차단.

### SEC-2. 모든 외부 입력은 검증 후 사용 [MUST]
- body, query, params, header, webhook payload 전부 Zod 파싱 통과 후에만 사용한다. 미검증 값을 쿼리/응답에 넣지 않는다.

### SEC-3. 소유권 검증 (IDOR 방지) [MUST]
- 리소스 접근/수정 시 "로그인 여부"만이 아니라 "이 actor가 이 리소스의 소유자/권한자인가"를 service에서 검증한다. `courseId`만 믿고 수정하는 코드 금지.

### SEC-4. RBAC + Actor 모델 [MUST]
- 모든 행위 주체는 `Actor { id, type: HUMAN | AGENT, role }`로 표현한다.
- admin API는 서버 측 RBAC로 강제한다. 화면 숨김은 권한 제어가 아니다.

### SEC-5. 비밀키 관리 [MUST]
- 비밀 값은 Git에 커밋하지 않는다. `.env.example`에는 키 이름만 기록한다. 서버 키는 `NEXT_PUBLIC_` 금지 (CON-4와 연동).

### SEC-6. 업로드 검증 [MUST]
- 업로드 파일은 MIME 화이트리스트, 크기 상한, 이미지 재인코딩을 거친다. 원본 그대로 저장/서빙 금지.

### SEC-7. Rate Limit [MUST]
- 로그인, 코스 생성, 댓글, 신고 API에는 rate limit을 적용한다.

### SEC-8. 로깅 금지 항목 [MUST]
- Access Token, 이메일 등 PII, 정밀 위치 좌표를 로그에 남기지 않는다.

### SEC-9. Webhook [MUST]
- 외부 webhook(결제, 예약)은 서명 검증 + 멱등 처리(INT-3)를 필수로 한다.

---

## 7. 성능 (PERF)

### PERF-1. 성능 예산 [SHOULD]
- 모바일 기준 LCP < 2.5s, 주요 API p95 < 300ms를 예산으로 삼고, 초과가 확인되면 기능 추가보다 우선 해결한다.

### PERF-2. 이미지 [MUST]
- `next/image`만 사용. 원본 직접 서빙 금지, 업로드 시 리사이즈/썸네일 생성.

### PERF-3. 무거운 클라이언트 코드는 dynamic import [MUST]
- 지도 SDK, 드래그앤드롭, 차트 등은 `next/dynamic`으로 분리 로드한다. 초기 번들에 포함 금지.

### PERF-4. 지도 데이터 상한 [MUST]
- 지도 마커 조회는 뷰포트(bounding box) 기준으로 제한하고 서버에서 개수 상한을 강제한다. "전체 장소 내려주고 클라이언트에서 필터" 금지.

### PERF-5. 병렬화 [SHOULD]
- 독립적인 비동기 호출은 `Promise.all`로 병렬 실행한다. 순차 await 나열 금지.

---

## 8. 영향도 관리 (IMP)

### IMP-1. API 하위 호환 [MUST]
- 배포된 API는 additive 변경만 허용: 필드 추가 O, 필드 제거/의미 변경/타입 변경 X.
- 파괴적 변경이 불가피하면 새 버전 경로(`/api/v2/...`)를 만들고 구버전은 유예 기간 후 제거한다.

### IMP-2. 스키마 변경 체크리스트 [MUST]
스키마 변경 PR은 다음을 명시한다:
1. 영향받는 feature/쿼리 목록
2. Expand–Contract 단계 중 어느 단계인지 (REG-4)
3. 기존 데이터 백필(backfill) 필요 여부와 방법
4. 인덱스 영향 (QRY-6)

### IMP-3. PR 영향 범위 섹션 의무 [MUST]
- 모든 PR은 템플릿의 "영향 범위" 섹션에 변경이 닿는 도메인, API, 스키마, 공용 모듈을 기재한다. "없음"도 명시적으로 적는다.

---

## 9. 데이터 정합성 (INT)

### INT-1. 제약은 DB에 [MUST]
- 유니크, FK, NOT NULL은 애플리케이션 검사에만 의존하지 않고 DB 제약으로 선언한다. 동시성 하에서 애플리케이션 검사는 뚫린다.

### INT-2. 트랜잭션 경계 = service 함수 [MUST]
- 트랜잭션은 service 함수 단위로 열고 닫는다. presentation에서 트랜잭션 조립 금지. 트랜잭션 안에서 외부 API 호출 금지 (지연·데드락 방지).

### INT-3. 멱등키 [MUST]
- 쿠폰 발급, 예약, 결제 등 중복 실행이 사고인 API는 `Idempotency-Key` 헤더를 받아 유니크 제약으로 중복을 차단한다.

### INT-4. 비동기 후속 작업은 상태 기반 [MUST]
- 번역, 썸네일, 알림 등 후속 작업은 "발행 즉시 실행"이 아니라 상태 컬럼(`PENDING → DONE/FAILED`)을 가진 레코드로 만들고, 처리기는 재실행해도 안전하게 작성한다. 실패 시 유실이 아니라 재시도 대상으로 남아야 한다.

### INT-5. Enum은 스키마로 [MUST]
- 상태 값은 Prisma enum으로 선언한다. 자유 문자열 status 금지.

### INT-6. 시간은 UTC [MUST]
- DB 저장은 UTC. 타임존 변환은 표시 계층에서만 한다.

### INT-7. 데이터 출처 기록 [MUST]
- 장소·행사 레코드는 유입 경로가 무엇이든(공공 API, 기업/에디터 등록, UGC) `sourceType`과 원본 참조를 기록한다. 출처 없는 canonical 데이터 금지.
- 외부 수집 데이터는 raw 원본을 스테이징에 보존한 뒤 정규화하여 병합한다 — 가공 로직이 바뀌어도 원본에서 재처리 가능해야 한다.
- 서로 다른 소스의 중복 의심 데이터는 자동 병합하지 않고 운영 큐로 보낸다 (AGT-2, 병합은 비가역이므로 AGT-3 승인 대상).

---

## 10. 생산성·재작업 방지 (PROD)

### PROD-1. Definition of Ready — 착수 전 계약 확정 [MUST]
기능 개발 착수 전에 다음을 먼저 확정하고 시작한다 (재작업의 최대 원인 차단):
1. Prisma 스키마 변경분
2. API 계약 (경로, 요청/응답 Zod 스키마)
3. 화면이 있다면 상태 흐름 (로딩/빈/에러 상태 포함)
- 이 3가지가 확정되지 않은 상태에서 UI부터 만들지 않는다.

### PROD-2. 작업 슬라이스 [SHOULD]
- 1 PR = 1 목적. 변경 diff 400라인 이내를 지향한다. 리팩터링과 기능 추가를 한 PR에 섞지 않는다.

### PROD-3. 만들기 전에 검색 [MUST]
- 유틸/컴포넌트/스키마를 새로 만들기 전에 기존 코드를 검색한다. 동일 목적 코드가 2개 발견되면 통합이 우선 작업이다.

### PROD-4. Feature 스캐폴드 템플릿 [MUST]
- 새 feature는 표준 구조를 복제해서 시작한다:
```text
features/{name}/
├─ schema.ts      # Zod 요청/응답/폼 스키마
├─ service.ts     # 비즈니스 로직
├─ queries.ts     # DB 접근
├─ components/    # feature 전용 UI
├─ hooks.ts       # TanStack Query 훅
└─ index.ts       # public API (외부 노출 전용)
```
- 구조를 임의 변형하지 않는다. 구조 변경이 필요하면 ADR.

### PROD-5. 커밋 컨벤션 [MUST]
- Conventional Commits: `feat|fix|refactor|test|docs|chore(scope): 요약`. scope는 feature명.

### PROD-6. 결정은 ADR로 고정 [MUST]
- 기술 선택, 구조 변경, 규칙 예외는 `docs/adr/NNNN-제목.md`로 기록한다 (배경/결정/대안/결과).
- "왜 이렇게 했더라?"로 인한 재논쟁과 번복이 최대 낭비 요인이다. 번복하려면 기존 ADR을 대체하는 새 ADR을 쓴다.

### PROD-7. 시드 데이터 표준 [MUST]
- `pnpm db:seed` 하나로 개발/테스트에 필요한 표준 데이터(유저 2, 커플 1, 장소 30, 코스 5 등)가 재현된다. 수동으로 만든 로컬 데이터에 의존하는 개발 금지.

### PROD-8. PR 전 자가 검증 [MUST]
- PR 생성 전 `pnpm verify`(lint + typecheck + test) 통과를 확인한다. CI에서 처음 발견되는 실패는 리뷰 낭비다.

### PROD-9. PR 템플릿 셀프 체크 [MUST]
- PR 템플릿 체크리스트(경계 규칙, 입력 검증, 트랜잭션, 인덱스, 영향 범위, 테스트)를 작성자가 먼저 체크한다. 리뷰어는 체크 안 된 항목만 집중 확인한다.

### PROD-10. TODO 금지 [MUST]
- 코드에 `TODO` 주석을 남기지 않는다. 남길 일이 생기면 이슈로 등록하고 주석에는 이슈 번호만 남긴다.

---

## 11. AI Agent 대비 (AGT)

운영 에이전트(서비스 운영 자동화)와 개발 에이전트(Claude Code 등)를 모두 1급 사용자로 취급한다.

### AGT-1. 모든 운영 행위는 도구화 가능해야 한다 [MUST]
- ARCH-6의 결과로, 운영 API는 "명확한 입력 스키마 + 표준 응답 + 권한 선언"을 갖춘다. 이 API 집합이 곧 향후 에이전트의 도구(tool) 목록이 된다.

### AGT-2. 운영 업무는 큐로 모델링 [MUST]
- 신고 처리, 번역 검수, 장소 병합 후보, 모더레이션 등 운영 업무는 상태 필드를 가진 대기열 데이터로 설계한다 (INT-4와 동일 패턴). 에이전트의 작업 단위는 "대기열에서 꺼내 판단하고 처리 API 호출"이다.

### AGT-3. 행위 등급 분리 [MUST]
- **자동 실행 가능**: 번역 검수, 앵커 후보 추천, 고확신 스팸 블라인드.
- **제안 후 인간 승인**: 유저 제재(Ban), 장소 병합(비가역), 쿠폰/정산/결제 관련.
- 승인 대기는 별도 상태(`PROPOSED → APPROVED/REJECTED`)로 모델링한다.

### AGT-4. AuditLog 필수 [MUST]
- 모든 운영 행위는 `AuditLog(actorId, actorType, action, targetType, targetId, before, after, createdAt)`에 기록한다. 에이전트 오판의 추적·롤백 근거가 된다. Day 1부터 적용.

### AGT-5. 개발 에이전트 준용 장치 [MUST]
- 이 가이드의 핵심 규칙은 루트 `CLAUDE.md`에 요약되어 모든 AI 개발 세션에 자동 로드된다.
- CLAUDE.md와 이 문서가 어긋나면 이 문서가 정본이며, CLAUDE.md를 갱신한다.

### AGT-6. 에이전트 친화적 코드베이스 유지 [SHOULD]
- 구조 예측 가능성(PROD-4), 계약 단일 소스(DATA-4), 결정 기록(PROD-6)은 사람만큼 에이전트의 정확도를 높이는 장치다. "이 코드는 에이전트가 컨텍스트 없이 열어봐도 규칙을 추론할 수 있는가"를 리뷰 관점에 포함한다.

---

## 12. 행동 데이터 수집 (ANL)

향후 개인화 추천(product baseline 7.5)의 원료가 되는 데이터를 단계 2부터 축적한다.

### ANL-1. 핵심 행동은 표준 이벤트로 기록 [MUST]
- 코스 조회/스크랩/공유, 필터 사용, 마법사 단계 진입·이탈, 지도 탐색 등 핵심 사용자 행동은 `lib/analytics/track()` 단일 진입점으로 기록한다. 개별 feature에서 직접 이벤트 저장 로직을 만들지 않는다.

### ANL-2. 이벤트 카탈로그 [MUST]
- 이벤트 이름과 속성 스키마는 `lib/analytics/events.ts`에 사전 정의된 것만 사용한다 (Zod 스키마). 임의 문자열 이벤트 금지 — 카탈로그에 없는 이벤트는 추가 정의 후 사용한다.
- 이벤트 이름은 `{도메인}.{행동}` 형식: `course.viewed`, `course.scrapped`, `wizard.step_completed`.

### ANL-3. 비동기·비침투 [MUST]
- 이벤트 기록은 append-only이며 요청 처리와 분리한다. 이벤트 기록 실패가 사용자 요청 실패로 이어지면 안 된다 (fire-and-forget + 에러 로깅).

### ANL-4. 이벤트 개인정보 최소화 [MUST]
- 이벤트 속성에 PII 원문(이메일, 닉네임)과 정밀 좌표를 넣지 않는다 (SEC-8 연동). 식별자는 `userId`, 위치는 상권/지역 단위까지만.

### ANL-5. 추천 피처는 관리형 태그로 [MUST]
- 장소·코스의 분위기/예산/상황 태그는 자유 입력이 아니라 관리형 태그 사전(Tag 테이블) 참조로 저장한다. 태그 사전 관리(추가/병합)는 운영 API로 수행한다 (ARCH-6).

---

## 13. 준용(Enforcement) 장치 (ENF)

규칙은 문서가 아니라 도구가 지킨다. 아래 장치는 0단계 스캐폴드 시 **코드와 함께 필수 생성**한다.

### ENF-1. 규칙 → 도구 매핑 [MUST]

| 규칙 | 강제 도구 |
|---|---|
| CON-1 (strict, any 금지) | tsconfig + `@typescript-eslint/no-explicit-any` |
| CON-7 (포맷) | Prettier + lint-staged pre-commit hook |
| ARCH-2/3/4 (계층·경계) | `eslint-plugin-boundaries` (import 경로 규칙) |
| CON-4/SEC-5 (env) | `lib/env.ts` Zod 검증 — 미정의 env는 기동 실패 |
| SEC-1 (기본 거부) | `withApiHandler` 래퍼 외 핸들러 export 금지 lint 규칙 |
| DATA-3 (Server Action 금지) | `"use server"` 사용 금지 lint 규칙 |
| REG-3/PROD-8 (게이트) | GitHub Actions: `pnpm verify` + build, main 브랜치 보호 |
| REG-4 (마이그레이션) | CI에서 `prisma migrate diff` 검사, 마이그레이션 파일 수정 감지 시 실패 |
| PROD-5 (커밋) | commitlint |
| PROD-9 (셀프 체크) | `.github/PULL_REQUEST_TEMPLATE.md` |
| PROD-10 (TODO 금지) | `no-warning-comments` lint 규칙 |
| CON-8 (문구 하드코딩 금지) | `react/jsx-no-literals` (app/·features/ 대상) |
| 관측성 (`console.log` 금지) | `no-console` lint 규칙 — `lib/logger`만 사용 |

### ENF-2. 도구로 강제 불가한 규칙 [MUST]
- QRY-6(인덱스), IMP-2(스키마 체크리스트), SEC-3(소유권), PROD-1(DoR)은 PR 템플릿 체크 항목 + 코드 리뷰에서 규칙 ID를 인용해 확인한다.

### ENF-3. Definition of Done [MUST]
작업 완료의 정의:
1. `pnpm verify` 통과
2. 신규/변경 로직의 테스트 존재 (REG-1)
3. PR 템플릿 전 항목 작성 (IMP-3, PROD-9)
4. 스키마/API 변경 시 체크리스트 완료 (IMP-1, IMP-2)
5. 문서 영향 있으면 baseline/guide/ADR 갱신

### ENF-4. 가이드 개정 절차 [MUST]
- 개정은 ADR 작성 → 이 문서 갱신 → CLAUDE.md 반영 → 관련 lint/CI 규칙 갱신 순서로 진행하며, 4가지가 한 PR에 함께 들어간다.
