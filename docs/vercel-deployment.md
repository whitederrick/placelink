# Vercel 배포 런북

## 환경 변수

Vercel 프로젝트 `ahn-namkyus-projects/placelink`의 Preview와 Production에 다음 값을
설정한다. 실제 값은 Git이나 문서에 기록하지 않는다.

### 필수

- `DATABASE_URL`: Vercel에서 접근 가능한 Postgres 연결 문자열
- `AUTH_SECRET`: 32자 이상의 무작위 인증 비밀값

로컬 Docker 주소(`localhost:54329`)는 Vercel에서 접근할 수 없다. Vercel 개발·검증용 데이터베이스는
PostGIS 확장을 지원해야 하며 serverless 환경에서는 풀링 연결 문자열을 우선한다.

### 기능별

- `AUTH_KAKAO_ID`, `AUTH_KAKAO_SECRET`: Kakao 로그인
- `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`: Google 로그인
- `NEXT_PUBLIC_KAKAO_MAP_APP_KEY`: Kakao 지도 JavaScript 키
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: Google 지도 키
- `KAKAO_LOCAL_REST_API_KEY`: 운영 장소 동기화
- `SEOUL_OPEN_DATA_API_KEY`: 서울시 문화행사 수집
- `CULTURE_PORTAL_SERVICE_KEY`: 문화포털 공연·전시 수집용 공공데이터포털 인증키
- `CRON_SECRET`: Vercel Cron 호출 인증용 16자 이상의 임의 문자열
- `NEXT_PUBLIC_SITE_URL`: 사용자 도메인이 있을 때만 설정. 없으면 Vercel의 안정적인
  Production 도메인을 자동 사용한다.
- `LOG_LEVEL`: 기본값 `info`

`NODE_ENV`, `CI`, `VERCEL_OIDC_TOKEN`은 Vercel이 관리하므로 직접 복사하거나
설정하지 않는다.

## 최초 배포 순서

마이그레이션은 앱 빌드와 분리한다. `next build` 또는 Vercel Build Command에서
`prisma migrate deploy`를 실행하지 않는다. Preview는 전용 Preview DB에 자동 적용하고,
Production은 승인된 배포 단계에서 아래 명령을 먼저 실행한 뒤 앱을 배포한다.

1. Preview와 Production 환경 변수의 값 입력을 완료한다.
2. 새 Production DB에서는 PostGIS 확장을 먼저 활성화한다. Supabase는 Database
   Extensions 화면에서 `postgis`를 활성화한다. 일반 PostgreSQL에서는 권한이 있는
   계정으로 `CREATE EXTENSION IF NOT EXISTS postgis;`를 실행한다.
3. Production DB에 Prisma 마이그레이션을 적용한다.

```bash
npx vercel env run -e production -- pnpm db:deploy
```

4. 최초 데이터가 없는 개발·검증 환경에서만 seed를 실행한다. 실제 운영 데이터가
   있는 Production에는 개발 seed를 실행하지 않는다.

```bash
npx vercel env run -e production -- pnpm db:seed
```

5. 기능 브랜치 Preview를 다시 배포하고 `/ko`, `/en`, `/robots.txt`,
   `/sitemap.xml`과 로그인 흐름을 확인한다.
6. PR의 `Quality`, `E2E`, `Vercel` 체크가 모두 통과하면 `main`에 병합한다.
7. Production 배포가 완료되면 동일 경로와 공개 코스 상세의 canonical,
   ko/en hreflang, Open Graph 이미지를 확인한다.
8. Vercel Settings → Cron Jobs에서 `/api/v1/cron/ingestions/schedules`가 일 1회로
   등록됐는지 확인하고, 첫 실행 후 `ingestion.synced` 감사 로그와 운영자 검수
   대기열을 확인한다.

## 현재 상태

- 기존 Production: <https://placelink-umber.vercel.app/ko>
- 개발·검증용 Supabase와 Production 운영 DB는 아직 분리되지 않았다.
- `place-link.com` DNS와 Kakao/Google OAuth 콘솔 설정은 보류 중이다.
- Production 마이그레이션은 DB 분리와 수동 승인 절차를 확인하기 전까지 실행하지 않는다.
