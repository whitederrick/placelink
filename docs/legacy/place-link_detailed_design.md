> ⚠️ **[ARCHIVED] 이 문서는 기획 참고 자료입니다.** 기술 결정의 정본은 [place-link_architecture_baseline.md](../place-link_architecture_baseline.md)와 [place-link_development_guide.md](../place-link_development_guide.md)이며, 이 문서와 충돌하는 내용(기술 스택, 스키마, API 등)은 정본을 따릅니다.

# 🚀 place-link: 상세 시스템 분석 및 개발 설계서 (Technical PRD)

본 문서는 AI 코딩 어시스턴트(Claude, Cursor, Github Copilot 등)에게 즉시 입력하여 프론트엔드/백엔드 코드를 스캐폴딩하고 실제 서비스 수준의 구현을 진행할 수 있도록 작성된 **최상위 수준의 상세 기획 및 기술 설계서**입니다.

---

## 1. 프로젝트 개요 (Project Overview)
* **서비스명:** place-link (플레이스 링크)
* **목적:** MZ세대 커플의 데이트 코스 UGC 생성/공유 및 외국인 관광객 대상 K-로컬 바이브 데이트 가이드 제공 (웹 기반 플랫폼)
* **개발 목표:** MVP 단계를 뛰어넘는 완성도 높은 모바일 웹 환경 구축. 글로벌 다국어 지원(Day 1) 및 초개인화된 코스 생성 경험 제공.
* **보상 정책 (Reward Policy):** 
  * **Phase 1 (오픈 시점):** 명예의 전당 노출 및 뱃지 부여 (소유욕, 과시욕 자극)
  * **Phase 2 (활성화 이후):** 코스 트래픽 기반 제휴처 쿠폰 제공, 스크랩 랭커 대상 기프티콘 리워드 연동 시스템.

---

## 2. 기술 스택 및 아키텍처 (Tech Stack & Architecture)
* **Frontend:** Next.js (App Router, SSR/SSG 최적화), React, TypeScript, Tailwind CSS, Framer Motion (부드러운 화면 전환)
* **State Management:** Zustand (전역 상태), TanStack Query (비동기 서버 데이터 캐싱 및 동기화)
* **Backend:** Node.js 기반 NestJS 또는 Next.js API Routes 활용 + Prisma (ORM)
* **Database:** PostgreSQL (위치 기반 데이터 처리를 위해 PostGIS 확장 고려)
* **Infra/Deploy:** Vercel (Front) + Supabase/AWS RDS (DB) + AWS S3/CloudFront (이미지 CDN)
* **3rd Party APIs:**
  * Maps: 카카오맵/네이버맵 API (내국인), Google Maps API (외국인)
  * Translation: Google Cloud Translation API (UGC 실시간 다국어 번역)
  * Auth: NextAuth.js (Kakao, Google, Apple 소셜 로그인)

---

## 3. 데이터베이스 스키마 설계 (Entity Relationship)
AI 모델이 Prisma 모델이나 SQL DDL을 생성할 수 있도록 테이블 구조를 명세합니다.

### 3.1. `User` & `Couple`
* **User:** `id` (PK), `email`, `nickname`, `profile_image_url`, `provider` (kakao, google), `created_at`
* **Couple:** `id` (PK), `user1_id` (FK), `user2_id` (FK), `couple_name` (예: "지훈❤️민지"), `d_day` (Date)

### 3.2. `Place` (장소 기본 마스터 데이터)
* **Place:** `id` (PK), `name_kr`, `name_en`, `address_kr`, `address_en`, `lat` (Float), `lng` (Float), `category` (POPUP, CAFE, RESTAURANT, ACTIVITY, EXHIBITION), `source_id` (외부 API ID), `is_anchor` (Boolean - 에디터가 지정한 핫플 여부)

### 3.3. `Course` & `Course_Node` (UGC 코스 데이터)
* **Course:** `id` (PK), `creator_couple_id` (FK), `title`, `description`, `theme_tags` (Array), `view_count`, `scrap_count`, `is_hall_of_fame` (Boolean), `created_at`
* **Course_Node:** `id` (PK), `course_id` (FK), `place_id` (FK), `order_index` (Int), `duration_minutes` (Int), `user_tip` (String - 유저가 남긴 꿀팁), `translated_tip` (JSON - 다국어 번역본 캐싱)

### 3.4. `Scrap` & `Reward` (Phase 1 & 2 대비)
* **Scrap:** `id` (PK), `user_id` (FK), `course_id` (FK), `created_at`
* **Reward_Policy:** `id`, `target_place_id`, `coupon_code`, `is_active` (향후 Phase 2 제휴 모델 확장을 위한 설계)

---

## 4. API 엔드포인트 명세 (API Specifications)

### 4.1. Core API
* `GET /api/places/anchors` : 에디터가 지정하거나 API로 수집한 '이번 주 핫 팝업/전시' 앵커 장소 반환. (파라미터: `region`, `date`)
* `GET /api/places/nearby` : 특정 위경도 기준 반경 2km 이내 장소 검색. (파라미터: `lat`, `lng`, `radius`, `category`)
* `POST /api/courses` : 신규 코스 생성. Request Body에 `nodes` 배열 (장소 ID 및 유저 팁) 포함.
* `GET /api/courses/{id}` : 코스 상세 정보 조회. Request Header의 `Accept-Language`에 따라 번역된 데이터를 반환.
* `GET /api/courses/hall-of-fame` : 주간/월간 스크랩 수 기반 명예의 전당 랭킹 리스트 반환.

---

## 5. 핵심 화면 및 컴포넌트 설계 (UI/UX Component Logic)

### 5.1. Global Layout & i18n 처리
* **Logic:** Next.js Middleware를 활용하여 접속 IP(또는 브라우저 설정 언어)를 감지하고 라우팅 (`/kr`, `/en`) 처리.
* **Component:** `Header`에 언어 전환 Toggle UI 컴포넌트 고정. 상태는 Zustand `useAppStore`에서 관리.

### 5.2. Home (랜딩 페이지)
* **`GreetingHero` 컴포넌트:**
  * 접속 시간대(아침/오후/밤)와 날씨 API를 연동하여 동적 카피 렌더링.
  * 예: `time > 18 && weather == 'rain'` -> "비 오는 저녁, 실내 데이트 어때요?"
* **`AnchorBanner` 컴포넌트 (초기 콜드 스타트 해결):**
  * `is_anchor=true`인 Place 데이터를 캐러셀(Carousel) 형태로 노출.
  * 클릭 시 해당 앵커 장소가 미리 채워진 상태로 `CourseWizard`로 라우팅 (`/course/new?anchor=place_id`).
* **`RealtimeFeed` 컴포넌트:**
  * 방금 등록된 UGC 코스 리스트. `IntersectionObserver`를 활용한 무한 스크롤(Infinite Scroll) 구현.

### 5.3. CourseWizard (코스 만들기 - 3 Step 마법사)
* **State Management (Zustand: `useCourseBuilderStore`):**
  * `selectedAnchor`: Object (선택된 앵커 장소)
  * `nodes`: Array (추가된 장소 리스트 및 순서)
  * `courseInfo`: title, tags, description
* **Step 1 (앵커 선택):** 핫플 리스트에서 메인 장소 1개 선택.
* **Step 2 (동선 빈칸 채우기 - 핵심 로직):**
  * **Map Component:** 앵커 장소 중심으로 지도를 렌더링.
  * 앵커 반경 1.5km의 API 데이터(`GET /api/places/nearby`)를 마커로 표시.
  * 유저가 마커 클릭 시 Bottom Sheet로 장소 상세 정보 제공 후 [코스에 추가] 버튼 클릭.
  * `Drag and Drop` (dnd-kit 라이브러리 권장) 기능으로 코스 순서 변경.
  * **꿀팁 입력 폼:** 각 노드(장소)마다 50자 이내의 `user_tip` 입력 필드 활성화.
* **Step 3 (발행 및 네이밍):**
  * "커플 이름(User 테이블 조인) + 코스" 자동 네이밍.
  * 썸네일 이미지 자동 생성 혹은 대표 장소 이미지 할당 후 `POST /api/courses` 전송.

### 5.4. CourseDetail (명예의 전당 / 공유 랜딩 페이지)
* **SEO & Meta (Next.js `generateMetadata`):**
  * 코스 제목, 대표 이미지, 팁 내용을 Open Graph (og:title, og:image) 태그로 SSR 동적 생성. 카카오톡/인스타 공유 시 시각적 임팩트 극대화.
* **`TrophyHeader` 컴포넌트:**
  * 닉네임("지훈❤️민지 코스")을 화면 1/3을 덮는 대형 타이포그래피로 연출. 명예의 전당(`is_hall_of_fame=true`)일 경우 화려한 파티클 애니메이션(framer-motion) 적용.
* **`RouteTimeline` 컴포넌트:**
  * 좌측에 세로 라인을 긋고 노드별 정보 렌더링.
  * 두 노드 사이의 거리(Distance)와 도보/차량 예상 시간 표기.
* **`SmartMapButton` 컴포넌트:**
  * 조건부 렌더링: `locale === 'ko'` ? 카카오맵 길찾기 딥링크 : 구글 맵스 길찾기 URL 생성.

### 5.5. Reward System (Phase 2 준비 로직)
* **컴포넌트 설계 시 사전 반영:** 
  * 상세 페이지 장소 리스트 하단에 `CouponBanner` 슬롯을 미리 컴포넌트로 분리해 둠. 
  * Phase 1에서는 `display: none` 또는 기능 안내 툴팁으로 처리하고, 향후 백엔드에서 `Reward_Policy` 데이터가 내려오면 제휴처 할인 쿠폰 바코드를 렌더링하도록 구조화.

---

## 6. 개발 진행 가이드 (For AI Assistant)
1. **Repository Setup:** Next.js (App Router), Tailwind CSS, Prisma 기반으로 초기 세팅을 진행하라.
2. **Database Migration:** 위 3번 항목의 스키마를 바탕으로 `schema.prisma` 파일을 작성하고 마이그레이션 코드를 생성하라.
3. **UI Implementation:** `CourseWizard` (코스 생성) 화면의 지도 기반 마커 선택 로직과 무한 스크롤 피드를 최우선적으로 구현하라. 디자인은 Shadcn UI를 베이스로 커스텀하여 미니멀하고 세련되게 구성하라.
