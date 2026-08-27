# 데이트 일정 데이터 공급망

## 목적

사용자 코스가 쌓이는 동안에도 서울시·지자체·문화기관·기업의 행사와 장소 운영
정보를 지속적으로 확보한다. 사용자는 특정 날짜와 시간에 실제로 이용 가능한 장소와
행사를 확인하고, 구조화가 어려운 정보는 공식 페이지에서 최종 확인할 수 있어야 한다.

## 분류 계약

출처와 콘텐츠 종류를 하나의 값으로 섞지 않는다.

- `sourceType`: `PUBLIC_API | BUSINESS | EDITOR | UGC`
  - 장소, 행사, 코스가 어디에서 유입됐는지를 나타낸다.
  - 사용자가 만든 코스는 생성 시 `UGC`로 기록한다.
- `Place.kind`: 카페, 음식점, 영화관, 박물관, 갤러리, 공원 등 상설 장소 유형이다.
- `Place.operatorType`: `PUBLIC | PRIVATE | NONPROFIT | UNKNOWN`으로 운영 주체를
  나타낸다. 공공 API에서 발견했다는 이유만으로 공공시설로 추정하지 않는다.
- `Happening.kind`: 전시, 팝업, 축제, 공연, 상영, 체험 등 기간성 콘텐츠 유형이다.
- 코스의 분위기·예산·상황은 기존 관리형 태그 사전을 사용한다.

기존 `Place.category`는 배포된 API와 화면의 호환성을 위해 유지한다. `Place.kind`를
채운 뒤 별도 Contract 변경에서 교체 여부를 결정한다.

## 일정 계약

- 장소의 정규 운영시간은 `PlaceOpeningPeriod`에 요일과 분 단위 시각으로 저장한다.
- 임시 휴무와 공휴일 변경 시간은 `PlaceOpeningException`에 날짜별로 저장한다.
- 전시·팝업의 전체 유효 기간은 `Happening.startsAt/endsAt`에 저장한다.
- 영화·공연처럼 회차가 있는 일정은 `ScheduleOccurrence`로 분리한다.
- 공급자가 자유 형식 시간만 제공하면 원문을 `scheduleText`에 보존하고 공식 링크를
  함께 제공한다. 확실하지 않은 회차를 추측해서 만들지 않는다.
- DB의 시각은 UTC로 저장하고 서울시의 날짜 경계는 Asia/Seoul 기준으로 변환한다.

## 수집 단계

1. 외부 응답 원문을 `IngestionRecord.rawPayload`에 보존한다.
2. 검증·정규화 결과를 `normalizedPayload`에 저장한다.
3. 동일 공급자·외부 ID·내용 checksum 조합은 한 번만 저장한다.
4. canonical Place/Happening 병합은 관리자 검수 큐에서 승인한 항목만 처리한다.
5. 서로 다른 공급자의 장소 중복은 자동 병합하지 않는다.

현재 구현된 공급자는 서울 열린데이터광장의 `culturalEventInfo`와 문화포털의
기간별 공연·전시 API다. 전시·공연·축제 분류, 기간, 장소 좌표와 공식 상세 링크를
공통 형식으로 정규화하며, 서울시 응답에 있는 운영시간·요금·예매 링크도 보존한다.

```bash
# DB에 쓰지 않고 최근 응답 검토
pnpm db:sync:cultural -- --end=100 --from=2026-08-27

# 원문과 정규화 결과를 스테이징에 멱등 저장
pnpm db:sync:cultural -- --stage --end=100 --from=2026-08-27
```

서울시에는 `SEOUL_OPEN_DATA_API_KEY`, 문화포털에는 공공데이터포털에서 발급한
`CULTURE_PORTAL_SERVICE_KEY`가 필요하다. 웹 운영 화면은 `apps/web/.env.local`,
CLI는 `packages/database/.env`에 설정하며 비밀값은 로컬/배포 환경 변수로만 관리한다.

## 운영자 검수

- `/ko/studio/ingestions`에서 공급자, 행사 유형, 운영 주체, 처리 상태별로 확인한다.
- 검수 대기 항목은 장소 유형·행사 유형·운영 주체를 보정한 뒤 병합하거나 사유와
  함께 반려한다.
- 병합은 `Place`, `Happening`, 공급자 참조를 한 트랜잭션에서 생성·갱신하며,
  승인과 반려 모두 `AuditLog`에 기록한다.
- 원본의 공식 정보 및 예약 링크를 운영자와 사용자에게 제공한다. 구조화가 불확실한
  운영시간은 `scheduleText` 원문과 공식 링크를 유지한다.
- 운영 API는 `GET /api/v1/admin/ingestions`와
  `PATCH /api/v1/admin/ingestions/{id}/review`이며 관리자 인증이 필요하다.
- 운영자는 검수 화면에서 서울시 또는 문화포털을 선택하거나
  `POST /api/v1/admin/ingestions/sync`의 `provider` 값으로 공급자를 지정해 최신
  데이터를 멱등 적재한다. 실행 결과도 `ingestion.synced` 감사 로그로 남긴다.
- Vercel Cron은 매일 UTC 21:10(한국시간 다음 날 06:10)에
  `GET /api/v1/cron/ingestions/schedules`를 호출한다. 호출은 `CRON_SECRET` Bearer
  인증을 통과해야 하며 `schedule-ingestion-cron` AGENT가 실행한 것으로 감사
  기록한다. 문화포털 키가 아직 없으면 서울시만 수집하고, 키 등록 후에는 두 공급자를
  병렬로 수집한다.
- 정기 실행은 현재 날짜에 종료되지 않은 최대 1,000건을 가져오며 checksum이 같은
  기존 원본은 다시 만들지 않는다. Vercel Hobby 플랜은 실행 시각이 해당 시간대 안에서
  지연될 수 있으므로 정확한 분 단위 실행을 전제로 하지 않는다.

## 공급자 도입 순서

1. 서울 열린데이터광장 문화행사와 문화포털 공연·전시
2. KOPIS 공연·축제
3. 박물관·미술관 및 공공시설 운영시간
4. 영화관은 공식 상영시간표·예매 링크 우선, 정식 제휴 데이터가 확보되면 회차 저장
5. 기업 팝업은 공식 링크 수집과 에디터 검수 후 파트너 직접 입력으로 전환

## 스키마 변경 영향

- 단계: Expand. 기존 컬럼과 API는 변경하지 않는다.
- 백필: 기존 장소의 `kind`는 현재 관리형 카테고리의 확정 매핑으로 채우고, 전시 장소의
  기존 행사는 `EXHIBITION`으로 채운다. 기존 코스의 `sourceType`은 알 수 없는 값을
  추측하지 않고 후속 검수에서 채운다.
- 신규 사용자 코스: 생성 시 즉시 `sourceType=UGC`를 기록한다.
- 인덱스: 장소 종류·운영 주체, 행사 종류·시작일, 코스 출처·발행일, 수집 상태·시각
  조회에 대응하는 복합 인덱스를 추가한다.
- 화면: 운영자 수집 검수 화면을 추가했다. 사용자 검색 필터는 공급자 확대와 기존
  데이터 백필 이후 별도 Contract에서 추가한다.
