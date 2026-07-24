# Vercel 배포 런북

## 환경 변수

Vercel 프로젝트 `ahn-namkyus-projects/placelink`의 Preview와 Production에 다음 값을
설정한다. 실제 값은 Git이나 문서에 기록하지 않는다.

### 필수

- `DATABASE_URL`: Vercel에서 접근 가능한 Postgres 연결 문자열
- `AUTH_SECRET`: 32자 이상의 무작위 인증 비밀값

로컬 Docker 주소(`localhost:54329`)는 Vercel에서 접근할 수 없다. 운영 데이터베이스는
PostGIS 확장을 지원해야 하며 serverless 환경에서는 풀링 연결 문자열을 우선한다.

### 기능별

- `AUTH_KAKAO_ID`, `AUTH_KAKAO_SECRET`: Kakao 로그인
- `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`: Google 로그인
- `NEXT_PUBLIC_KAKAO_MAP_APP_KEY`: Kakao 지도 JavaScript 키
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: Google 지도 키
- `KAKAO_LOCAL_REST_API_KEY`: 운영 장소 동기화
- `NEXT_PUBLIC_SITE_URL`: 사용자 도메인이 있을 때만 설정. 없으면 Vercel의 안정적인
  Production 도메인을 자동 사용한다.
- `LOG_LEVEL`: 기본값 `info`

`NODE_ENV`, `CI`, `VERCEL_OIDC_TOKEN`은 Vercel이 관리하므로 직접 복사하거나
설정하지 않는다.

## 최초 배포 순서

1. Preview와 Production 환경 변수의 값 입력을 완료한다.
2. Production DB에 PostGIS와 Prisma 마이그레이션을 적용한다.

```bash
npx vercel env run -e production -- pnpm db:deploy
```

3. 최초 데이터가 없는 경우에만 seed를 실행한다.

```bash
npx vercel env run -e production -- pnpm db:seed
```

4. 기능 브랜치 Preview를 다시 배포하고 `/ko`, `/en`, `/robots.txt`,
   `/sitemap.xml`과 로그인 흐름을 확인한다.
5. PR의 `Quality`, `E2E`, `Vercel` 체크가 모두 통과하면 `main`에 병합한다.
6. Production 배포가 완료되면 동일 경로와 공개 코스 상세의 canonical,
   ko/en hreflang, Open Graph 이미지를 확인한다.

## 현재 상태

- Draft PR: <https://github.com/whitederrick/placelink/pull/1>
- GitHub Actions `Quality`, `E2E`: 통과
- 최초 Vercel Preview: `DATABASE_URL` 미설정으로 실패
- Vercel 변수 이름: 사용자 등록 완료
- 환경 변수 실제 값과 운영 DB: 준비 중이며 아직 검증하지 않음
- 로컬 SEO 커밋 `5111551`: 원격 기능 브랜치보다 1개 앞서 있으며 값 입력 전에는
  push하지 않음
- 환경 변수 값 입력 및 운영 DB 준비 후 migration → 필요 시 seed → push/재배포 필요
