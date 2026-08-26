# 홈 앵커 큐레이션 운영 계약

홈의 팝업·전시 앵커는 데이터베이스를 직접 수정하지 않고 관리자 API로 지정한다.
두 API 모두 로그인한 관리자만 사용할 수 있다.

관리자 화면은 `/{locale}/ops/happenings`에서 제공한다. 행사 상태와 홈 노출
여부를 함께 필터링하고, 각 카드에서 노출 지정·해제를 실행할 수 있다. 권한이
없는 사용자는 화면과 API 모두 접근할 수 없다.

## 행사 조회

`GET /api/v1/admin/happenings`

- `locale`: `ko` 또는 `en`, 기본 `ko`
- `status`: `UPCOMING`, `ACTIVE`, `ENDED` 중 선택
- `anchor`: `true` 또는 `false`
- `take`: 1~100, 기본 50

응답에는 행사 ID, 현지화 제목과 장소명, 상태, 시작·종료 시각, 현재 앵커 여부가 포함된다.

## 앵커 지정·해제

`PATCH /api/v1/admin/happenings/{happeningId}/anchor`

```json
{ "isAnchor": true }
```

- 실제 값이 바뀔 때만 행사와 감사 기록을 하나의 트랜잭션으로 저장한다.
- 감사 기록에는 관리자, 지정·해제 행위, 대상 행사, 변경 전후 값이 남는다.
- 같은 값을 다시 요청하면 성공 응답의 `changed`가 `false`이며 중복 감사 기록은 만들지 않는다.
