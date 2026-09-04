# PlaceLink 정지 만료 자동 복구 인수인계 — 2026-09-04

## 정책

- 종료 시각이 지난 기간제 정지는 자동으로 `ACTIVE` 상태로 복구한다.
- 종료 시각이 없는 무기한 정지는 자동 복구하지 않는다.
- 만료 후 사용자가 다시 접근하면 인증 Actor를 만들기 전에 즉시 복구한다.
- 일일 cron은 접근하지 않은 계정을 정리하는 백스톱 역할을 한다.

## 구현

- 인증 시 만료된 정지를 원자적으로 복구하고 감사로그
  `user.status.auto_restored`를 남긴다.
- `GET /api/v1/cron/users/suspensions`는 `CRON_SECRET`으로 인증된
  `user-suspension-expiry-cron` AGENT만 호출할 수 있다.
- cron은 한 번에 최대 500명을 처리하며, 상태와 정지 종료 시각 조건을 업데이트
  시점에도 다시 검사한다.
- 각 사용자별 변경 전후를 감사로그에 저장한다.
- 기존 `users(status, suspended_until)` 인덱스를 사용하므로 마이그레이션은 없다.
- Vercel Hobby에서도 배포 가능한 일일 cron으로 등록했다. Pro 이상에서는 운영
  요구에 따라 더 짧은 주기로 변경할 수 있지만, 사용자 접근 시 즉시 복구되므로
  로그인 복구 시점은 cron 주기에 의존하지 않는다.

## 검증 범위

- 기간제 정지 만료 복구와 무기한 정지 유지 service 테스트
- 최대 처리량, 다음 배치 여부, 업데이트 조건과 사용자별 감사로그 query 테스트
- cron 응답 스키마와 AGENT 전용 실행 권한 테스트

## 배포 전 확인

- Production의 `CRON_SECRET`이 16자 이상의 안전한 값으로 설정되어 있어야 한다.
- 배포 후 Vercel Cron Jobs에서 `/api/v1/cron/users/suspensions` 등록과 첫 실행 로그를
  확인한다.
