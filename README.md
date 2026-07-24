# place-link

커플이 직접 만든 데이트 코스를 등록하고 공유하는 모바일 우선 UGC 플랫폼입니다.

## 시작하기

```bash
pnpm install
pnpm dev
```

- 한국어: `http://localhost:3000/ko`
- English: `http://localhost:3000/en`
- 전체 검증: `pnpm verify`

## 로컬 데이터베이스

```bash
pnpm db:up
pnpm db:migrate
pnpm db:seed
```

PostgreSQL 16 + PostGIS가 `localhost:54329`에서 실행됩니다.

제품과 기술 결정은 `CLAUDE.md`가 안내하는 세 기준 문서를 따릅니다.
