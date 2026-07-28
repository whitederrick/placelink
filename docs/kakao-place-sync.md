# Kakao 장소 동기화

PlaceLink는 Kakao Local REST API의 키워드 검색 결과를 서버에서 가져와 `Place`,
`PlaceTranslation`, `PlaceProviderRef`에 멱등 반영한다. 브라우저에는 REST API 키를
노출하지 않는다.

## 사전 준비

1. Kakao Developers에서 애플리케이션을 생성한다.
2. 앱 설정에서 Kakao Maps API 사용을 활성화한다.
3. REST API 키를 `apps/web/.env`에 추가한다.

```dotenv
KAKAO_LOCAL_REST_API_KEY="your-server-rest-api-key"
```

실제 키는 `.env.example`이나 Git에 커밋하지 않는다. 운영 환경에서는 Kakao
Developers의 보안 설정과 쿼터도 함께 확인한다.

공식 문서:

- <https://developers.kakao.com/docs/ko/local/common>
- <https://developers.kakao.com/docs/ko/local/dev-guide>

## 실행

먼저 한 지역을 읽기 전용으로 확인한다.

```bash
pnpm db:sync:kakao -- --dry-run --area=seongsu
```

출력의 장소명, 주소, 분류를 검토한 뒤 해당 지역을 반영한다.

```bash
pnpm db:sync:kakao -- --area=seongsu
```

지원 지역 전체를 반영하려면 지역 옵션을 생략한다.

```bash
pnpm db:sync:kakao
```

지원 지역은 `seongsu`, `yeonnam`, `seochon`, `hannam`, `mangwon`이다. 각 지역에서
전시, 카페, 소품샵, 식당, 산책, 바 키워드를 거리순으로 검색한다.

각 검색은 가까운 후보 10개를 가져온 뒤 Kakao 제공 카테고리로 적합성을 확인해
최대 3개를 선택한다. 카페에서는 대형 프랜차이즈를 제외하고, 식당과 바는
`음식점` 그룹 안에서도 `술집` 여부를 구분한다. dry-run 출력에는 검토를 위해
Kakao 원본 카테고리와 기준점으로부터의 거리도 포함한다.

## 데이터 정책

- Kakao 장소 ID와 `KAKAO` 제공자 조합을 고유 키로 사용하므로 재실행해도 중복
  장소를 만들지 않는다.
- 장소명, 주소, Kakao 장소 URL, 전화번호, 좌표, 지역, 카테고리를 동기화한다.
- Kakao Local 응답에 없는 사진과 영업시간은 추측하거나 복제하지 않는다.
- 현재 영어 번역 레코드에는 검증 가능한 원문 이름과 주소를 유지한다. 별도 번역
  소스가 생기기 전에는 자동 번역된 사실처럼 표시하지 않는다.
- API 오류에는 상태와 제한된 응답 본문만 포함하며 REST API 키는 기록하지 않는다.
