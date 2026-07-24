# UI foundation — initial screen contract

이 문서는 화면 골격 작업의 Definition of Ready 기록이다. 제품 정본의 단계 2 UX를 정적 프리뷰로 먼저 검증하며 DB/API 계약은 변경하지 않는다.

## 범위

- `/[locale]`: 홈 — 날씨/시간대 히어로, 기간이 표시된 앵커, 최신 UGC 코스 피드
- `/[locale]/explore`: 상권/분위기 검색과 지도 프리뷰
- `/[locale]/create`: 3단계 마법사의 Step 2 동선 편집 프리뷰
- `/[locale]/courses/[slug]`: 공유 랜딩, 트로피 헤더, 타임라인, 지도/공유 액션
- `/[locale]/my`: 커플 연결 상태, D-Day, 제작/스크랩 요약

## 상태 흐름

| 화면 | 기본 | 로딩 | 빈 상태 | 오류 | 다음 구현 경계 |
|---|---|---|---|---|---|
| 홈 | 앵커와 코스 카드 | 카드 스켈레톤 | 상권 탐색 CTA | 재시도 카드 | discovery service 조회 |
| 탐색 | 상권 기준 지도/목록 | 지도 플레이스홀더 | 필터 초기화 CTA | 지도 없이 목록 유지 | places API + TanStack Query |
| 만들기 | 앵커→동선→발행 | 장소 검색 스켈레톤 | 앵커 선택 CTA | 초안 유지 + 재시도 | Zustand draft + courses API |
| 상세 | 트로피/타임라인 | 헤더 스켈레톤 | 해당 없음(404) | 공유 가능한 오류 화면 | courses service SSR |
| 마이 | 연결 커플/D-Day | 프로필 스켈레톤 | 커플 초대 CTA | 개인 정보 영역 재시도 | auth/couples service |

## 계약 메모

- 이번 슬라이스는 시각 골격이므로 Prisma 스키마 변경이 없다.
- 외부 요청과 변이가 없어 API/Zod 요청 계약도 추가하지 않는다.
- 홈 프리뷰 데이터만 `features/discovery`의 schema → service → queries 경계를 통과한다.
- 사용자 UI 문구는 ko/en 메시지 키를 통해 제공한다.
