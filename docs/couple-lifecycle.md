# Couple lifecycle contract

커플 연결 기능의 API, 데이터 규칙, 화면 동작을 정리한다. 제품 정책의 기준은
`docs/place-link_product_baseline.md` 10장이다.

## 연결 규칙

- 한 사용자가 초대 링크를 생성하고 다른 사용자가 수락해야 커플이 성립한다.
- 사용자는 동시에 하나의 활성 커플에만 속할 수 있다.
- 자기 초대 수락, 만료·폐기·이미 사용한 초대 수락은 거부한다.
- 초대 토큰 원문은 생성 응답에 한 번만 노출하며 DB에는 SHA-256 해시만 저장한다.
- 새 초대를 생성하면 같은 사용자의 기존 미사용 초대는 폐기한다.
- 초대 유효기간은 생성 시점부터 7일이다.
- 미래 날짜는 커플 시작일로 지정할 수 없다.

## 솔로 코스 전환

- 초대한 사람과 수락한 사람은 각자 자신의 솔로 코스를 새 커플 소유로 전환할지 선택한다.
- 한 사람의 선택이 상대방 코스에 영향을 주지 않는다.
- 전환 대상은 삭제되지 않은 솔로 코스이며 자동 전환하지 않는다.
- 커플 생성, 멤버 등록, 선택한 코스 전환, 초대 소진은 하나의 DB 트랜잭션이다.

## 연결 해제

- 어느 한쪽이 요청하면 상대방 동의 없이 즉시 해제한다.
- `Couple.status`를 `DISSOLVED`로 바꾸고 두 활성 멤버십의 `leftAt`을 기록한다.
- 과거 커플 코스는 삭제하지 않고 기존 `Couple` 소유권을 유지한다.
- 조회 시 해제된 커플명은 `익명 커플 코스`로 표시하며 새 커플에 병합하지 않는다.

## API

| Method | Path | Auth | 설명 |
|---|---|---|---|
| `GET` | `/api/v1/couples/status` | user | 현재 활성 연결과 상대방 정보를 조회한다. |
| `POST` | `/api/v1/couples/invites` | user | 시작일과 솔로 코스 전환 선택을 받아 초대 링크를 만든다. |
| `GET` | `/api/v1/couples/invites/{token}` | public | 유효한 초대의 초대자·시작일·만료일을 조회한다. |
| `POST` | `/api/v1/couples/invites/{token}` | user | 초대를 수락하고 새 커플을 생성한다. |
| `DELETE` | `/api/v1/couples/current` | user | 현재 활성 커플 연결을 해제한다. |

## 화면

- `/{locale}/my`: 솔로 사용자는 시작일과 코스 전환 여부를 정해 링크를 생성·복사한다.
- `/{locale}/my`: 연결된 사용자는 영향 안내를 확인한 뒤 연결을 해제한다.
- `/{locale}/couple/invite/{token}`: 초대 내용을 공개 조회하고 로그인 후 수락한다.
- 초대 화면과 마이페이지 조작 문구는 한국어와 영어를 모두 제공한다.

## 주요 구현

- `apps/web/src/features/couples/schema.ts`
- `apps/web/src/features/couples/service.ts`
- `apps/web/src/features/couples/queries.ts`
- `apps/web/src/features/couples/components/CoupleControls.tsx`
- `apps/web/src/features/couples/components/CoupleInviteScreen.tsx`
- `packages/database/prisma/migrations/20260722120000_add_couple_invites/migration.sql`

