# Data foundation — stage 1 schema contract

이 문서는 핵심 도메인 스키마 작업의 Definition of Ready 및 영향도 기록이다.

## Expand–Contract 단계

- 현재 변경은 신규 테이블과 인덱스만 추가하는 **Expand** 단계다.
- 기존 데이터와 API가 없으므로 백필과 하위 호환 전환은 필요하지 않다.
- 생성된 마이그레이션 파일은 적용 후 수정하지 않는다.

## 핵심 불변 조건

- 인증 계정은 `(provider, externalId)`로 유일하다.
- 한 사용자는 `leftAt IS NULL`인 활성 커플 멤버십을 하나만 가진다.
- 코스는 솔로 작성자 또는 당시 커플 중 정확히 하나를 소유자로 가진다.
- 행사 데이터는 `startsAt < endsAt`이어야 한다.
- 코스 노드의 순서는 코스 안에서 유일하고 팁은 최대 50자다.
- 스크랩은 사용자와 코스 조합당 하나다.
- 장소 반경 검색은 PostGIS geography와 GIST 인덱스를 사용한다.

## 조회 패턴과 인덱스

| 조회 | 인덱스 |
|---|---|
| 최신 공개 코스 cursor 목록 | `(status, publishedAt, id)` |
| 활성 앵커 및 종료일 | `(isAnchor, status, endsAt)` |
| locale별 장소명 검색 | `(locale, name)` |
| 상권·카테고리별 장소 목록 | `(status, areaSlug, category, id)` |
| 반경 장소 검색 | `location GIST` |
| 코스별 최신 스크랩 | `(courseId, createdAt)` |
| 운영 감사 이력 | `(targetType, targetId, createdAt)` |

## API 계약

### Auth.js 세션

- 운영 공급자: Kakao, Google. OAuth 계정은 `AuthIdentity(provider, externalId)`로 User와 분리한다.
- 인증 필수 API는 세션의 User ID로 활성 사용자를 다시 조회해 `Actor { id, type, role }`를 구성한다.
- 로컬 개발 로그인은 [ADR 0001](adr/0001-development-auth-provider.md)에 따라 production에서 제외된다.

### `GET /api/v1/courses/anchors`

- 인증: `public`
- Query: `{ locale, cursor?, take?: 1..50 }`
- 활성 또는 예정 상태이며 종료되지 않은 앵커 행사와 장소 정보를 반환한다.

### `POST /api/v1/courses`

- 인증: `user`
- Body: `{ locale, anchorHappeningId }`
- 활성 커플 멤버십이 있으면 커플 소유, 없으면 개인 소유로 Draft와 첫 CourseNode를 함께 생성한다.
- 10분 동안 동일 소유자 기준 Draft 10개로 제한한다.

### `GET /api/v1/discovery/feed`

- 인증: `public`
- Query: `{ locale: "ko" | "en", cursor?: string, take?: 1..50 }` — 기본값 `ko`, 20개
- 성공: `{ data: { happenings, courses }, meta: { nextCursor? } }`
- 실패: `{ error: { code, message } }`
- Server Component는 이 API를 호출하지 않고 동일한 discovery service를 직접 호출한다.

### `GET /api/v1/places`

- 인증: `public`
- Query: `{ locale, query?, area?, category?, cursor?, take?: 1..50 }`
- `area`: `seongsu | yeonnam | seochon | hannam | mangwon`
- 성공: `{ data: PlaceSummary[], meta: { nextCursor? } }`
- 탐색 Server Component는 동일한 places service를 직접 호출하며 검색어와 상권을 URL query로 유지한다.

### `GET /api/v1/places/nearby`

- 인증: `public`
- Query: `{ locale, lat, lng, radiusMeters?: 100..5000, category?, take?: 1..50 }`
- 성공: `{ data: (PlaceSummary & { distanceMeters })[], meta: { radiusMeters } }`
- 반경 계산은 `queries.ts`의 파라미터 바인딩된 PostGIS `ST_DWithin`/`ST_Distance` 쿼리로만 수행한다.

### `GET /api/v1/places/map`

- 인증: `public`
- Query: `{ locale, south, west, north, east, category?, take?: 1..50 }`
- 남서·북동 좌표 순서를 검증하며 위도·경도 폭이 각각 1도를 넘는 요청은 거부한다.
- 성공: `{ data: PlaceSummary[], meta: { capped } }`
- PostGIS envelope와 geography GIST 인덱스로 현재 뷰포트 안의 장소만 조회한다.
- 클라이언트는 Kakao/Google 지도 이동 후 사용자가 “이 지역 다시 검색”을 선택할 때 TanStack Query로 호출한다.

## 장소 상권 필드 확장

- `Place.areaSlug`는 기존 레코드와 수집 파이프라인의 호환성을 위해 nullable로 추가한 Expand 단계 필드다.
- 신규 시드와 이후 수집 데이터는 상권 slug를 기록한다.
- 운영 데이터 백필 및 미기입 모니터링이 끝난 뒤 별도 Contract 마이그레이션에서 non-null 전환을 검토한다.

## 표준 개발 데이터

`pnpm db:seed`는 사용자 2명, 커플 1개, 장소 30개, 앵커 행사 3개, 관리형 태그 5개, 공개 코스 5개를 재현한다.
