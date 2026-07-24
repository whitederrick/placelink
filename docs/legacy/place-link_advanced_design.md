> ⚠️ **[ARCHIVED] 이 문서는 기획 참고 자료입니다.** 기술 결정의 정본은 [place-link_architecture_baseline.md](../place-link_architecture_baseline.md)와 [place-link_development_guide.md](../place-link_development_guide.md)이며, 이 문서와 충돌하는 내용(별도 admin 앱, 스키마 등)은 정본을 따릅니다.

# 🚀 place-link: 심화 시스템 분석 및 개발 설계서 v2.0 (프론트/백오피스 통합)

본 문서는 개발자가 즉시 티켓(Jira, Linear 등)을 쪼개고 코드를 작성할 수 있도록, **MZ세대 감성을 반영한 UI/UX 원칙**, **사용자(Front) 상세 화면/기능**, 그리고 서비스 운영을 위한 **시스템 관리자(Backoffice) 기능**까지 포괄적으로 정의한 심화 설계서입니다.

---

## 1. 디자인 시스템 & UI/UX 컨셉 (MZ 타겟)

단순히 예쁜 것을 넘어, 인스타그래머블(Instagrammable)하고 직관적인 '앱 같은 웹'을 지향합니다.

*   **Design Trend: "Neon-Minimalism & Glassmorphism"**
    *   **Color Palette:** 기본은 딥 다크 모드(Deep Black) 혹은 극도의 화이트(Clean White)로 대비를 주고, 포인트 컬러로 '애시드 그린(Acid Green)' 또는 '일렉트릭 핑크(Electric Pink)'를 사용하여 트렌디함 강조.
    *   **Typography:** Pretendard(기본) + 한글/영문 섞임이 자연스러운 타이포. 타이틀은 화면을 압도하는 굵고 큰 폰트(Bold, ExtraBold) 사용.
    *   **Micro-interactions:**
        *   좋아요/스크랩 시 햅틱 피드백(웹 진동 API 활용) 및 파티클 터지는 애니메이션 (Framer Motion).
        *   지도 마커나 카드를 탭할 때 부드럽게 팽창하는 글래스모피즘(투명도 섞인 블러 효과) 바텀 시트 적용.
*   **UX 원칙 (Zero-Friction):**
    *   **No 햄버거 메뉴:** 모든 핵심 행동은 하단 플로팅 탭바(Tab Bar)와 화면 내 스와이프 제스처로 해결.
    *   **게이미피케이션:** 입력 폼을 딱딱하게 만들지 않고, 챗봇과 대화하듯 혹은 슬롯머신을 돌리듯 인터랙티브하게 구성.

---

## 2. 사용자(Front-end) 세부 화면 및 기능 정의

### 2.1. 랜딩 & 홈 화면 (Home)
*   **동적 히어로 섹션 (Dynamic Hero):**
    *   **기능:** 사용자 접속 시점의 날씨/시간, 위치(Geo-location 동의 시) 기반 개인화된 큐레이션 문구 노출. (예: "밤 11시, 홍대에서 막차 타기 아쉬울 때")
    *   **화면 요소:** 스와이프 가능한 틱톡 스타일의 풀스크린(Full-screen) 숏폼/이미지 배너.
*   **실시간 K-바이브 피드:**
    *   **기능:** 실시간으로 유저들이 생성한 코스를 무한 스크롤(Virtual Scroll 적용으로 성능 최적화)로 제공.
    *   **화면 요소:** 각 코스 카드는 썸네일 + "OO❤️OO 코스" 타이틀 + 소요 시간 + 태그(ex. #도보10분 #힙플레이스) 노출.
*   **필터 및 정렬:**
    *   **기능:** 바텀 시트를 통해 '상황별(기념일, 비오는날)', '예산별', '분위기별' 다중 필터링 지원.

### 2.2. 코스 생성 마법사 (Course Wizard - 3 Steps)
*   **Step 1: 앵커(메인 장소) 픽업**
    *   **기능:** 검색창 지원 + 관리자가 지정한 '이번 주 핫플(팝업, 전시)' 가로 스와이프 리스트.
    *   **화면 요소:** 장소 선택 시 인스타그램 스토리처럼 화면 전환 애니메이션 발생.
*   **Step 2: 동선 메이커 (Interactive Map)**
    *   **기능:** 선택한 앵커 반경 1~2km 이내의 POI(Point of Interest) 데이터를 지도에 클러스터링 마커로 렌더링.
    *   **세부 로직:** 
        *   드래그 앤 드롭(Drag & Drop)으로 노드(장소) 순서 변경.
        *   A 장소와 B 장소 사이의 이동 시간을 실시간 계산 (카카오/구글 방향성 API 연동)하여 선(Polyline)과 함께 툴팁으로 표시.
        *   유저가 해당 장소에 대한 '한줄 꿀팁(예: "시그니처 메뉴 꼭 시키세요")' 입력 폼 제공.
*   **Step 3: 코스 브랜딩 (발행)**
    *   **기능:** 커플 닉네임 연동을 통한 자동 네이밍. AI(OpenAI API 활용)가 유저 팁과 카테고리를 분석해 코스를 한 줄로 요약해주는 기능.
    *   **화면 요소:** 발행 전 인스타 공유용 정방형 카드(포토카드 형태) 미리보기 제공.

### 2.3. 코스 상세 및 명예의 전당 (Trophy View)
*   **기능:** 코스의 상세 정보 확인 및 외부 공유, 네비게이션 연동.
*   **화면 요소:**
    *   **포토 갤러리:** 상단 영역에 장소들의 대표 이미지를 모자이크 형태로 자동 구성.
    *   **타임라인 동선:** 수직(Vertical) 진행형 타임라인. 현재 시간 기준으로 "지금 출발하면 O시 O분 도착" 같은 동적 시간표 시뮬레이션 제공.
    *   **투트랙 지도 이동 버튼:** `내국인 -> 카카오/네이버 맵앱 호출`, `외국인 -> 구글맵 웹/앱 호출` (다국어 i18n 감지).
    *   **액션 바 (Sticky Bottom):** 스크랩(저장) 버튼, 카카오톡/인스타 공유 버튼. 명예의 전당 등극 시 황금 뱃지 UI 추가.

### 2.4. 마이페이지 (My Place) & 보상 지갑
*   **기능:** 커플 프로필 관리, 스크랩 코스 관리, 쿠폰함.
*   **화면 요소:**
    *   **커플 D-Day 대시보드:** 사귄 날짜 입력 시 "D+100" 등 직관적 노출.
    *   **내 쿠폰함 (Phase 2):** 제휴 팝업스토어 프리패스권, 카페 할인권 등 획득한 리워드를 티켓 형태의 UI로 보관 및 바코드 노출 (밝기 최대화 스크립트 적용).

---

## 3. 시스템 관리자 (Backoffice / Admin) 상세 기능 정의

운영진이 서비스를 통제하고 콘텐츠 품질을 유지하기 위한 백오피스 설계입니다. 프론트엔드와 분리된 별도 프로젝트(예: React Admin, Refine, 또는 Next.js Admin Template)로 구축합니다.

### 3.1. 대시보드 (Dashboard)
*   **주요 지표 모니터링:** 일간/주간/월간 MAU, DAU, 신규 생성된 코스 수, 최다 스크랩 코스 랭킹 Top 10.
*   **글로벌 트래픽:** 접속 국가별 분포율 (Google Analytics 연동 혹은 서버 로그 분석).

### 3.2. POI (장소 데이터) 관리
공공데이터와 유저가 입력한 데이터의 품질을 관리하는 핵심 메뉴입니다.
*   **장소 마스터 DB 관리:**
    *   장소 검색, 수정(영업시간, 주소 오타 수정), 신규 수동 등록 기능.
    *   **에디터 픽(Anchor) 지정:** 특정 장소를 '핫플' 플래그를 켜서 유저들의 코스 생성 유도 배너에 노출.
    *   **데이터 병합(Merge):** 유저가 동일한 장소를 이름만 살짝 다르게(예: '스타벅스 강남점', '스벅 강남') 중복 등록 시, 이를 하나의 POI ID로 병합하는 관리 기능.
*   **이미지 검수:** 장소에 매핑된 대표 이미지가 깨지거나 부적절한지 모니터링 및 교체.

### 3.3. 코스(UGC) 및 콘텐츠 관리
*   **UGC 모니터링 및 필터링:**
    *   욕설/비속어 필터링 시스템에 걸린 '코스 타이틀' 또는 '한줄 팁' 리스트업 및 수정/블라인드(숨김) 처리 기능.
*   **명예의 전당 수동/자동 관리:**
    *   자동 로직(스크랩 수 Top N) 외에, 기획전 성격으로 에디터가 수동으로 특정 코스를 '명예의 전당' 또는 '메인 배너'에 꽂아넣을 수 있는 CMS(Content Management System) 기능.

### 3.4. 유저 및 커플 관리
*   **회원 관리:** 가입 유저 목록, 소셜 로그인 타입(Kakao, Google) 확인.
*   **제재/블랙리스트:** 어뷰징(도배 등) 유저 이용 정지(Ban) 처리 및 로그아웃 강제 실행 기능.

### 3.5. 제휴 및 보상(Reward) 관리 (Phase 2 대비)
*   **캠페인/쿠폰 등록:**
    *   특정 장소(POI ID)와 연계된 쿠폰 발행 기능. (예: A카페 아메리카노 1+1 쿠폰 1,000장 핀코드 난수 생성 및 엑셀 업로드).
*   **보상 지급 룰 설정:** "코스 조회수 1,000회 달성 시", "특정 팝업스토어를 코스에 포함하여 생성 시" 등의 Trigger 조건을 설정하여 유저에게 자동 쿠폰 발급.
*   **사용 내역 추적:** 발급된 쿠폰의 사용 상태(Used / Unused) 및 제휴처별 정산용 데이터 엑셀(CSV) 다운로드 기능.

### 3.6. 다국어 / 로컬라이제이션 관리
*   **번역 검수(Translation QC):**
    *   Google/DeepL API로 자동 번역된 '유저 팁' 중 길이가 길거나 핵심인 데이터 리스트업.
    *   운영자가 영문/일문 번역 결과를 직접 검토하고 어색한 표현을 수동 오버라이드(Override) 업데이트하는 기능.

---

## 4. 확장된 데이터베이스 스키마 (Admin 반영)

```prisma
// 기존 스키마에 추가/수정되는 내용

// 백오피스 관리자 테이블
model Admin_User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  password  String   // Bcrypt 해시
  role      String   // SUPER_ADMIN, EDITOR, CS
  createdAt DateTime @default(now())
}

// 쿠폰 및 보상 테이블 (Phase 2)
model Campaign {
  id            Int      @id @default(autoincrement())
  targetPlaceId Int?     // 특정 장소와 연계될 경우
  title         String   // 예: "성수 팝업스토어 프리패스 앵콜"
  totalQuantity Int
  remainQuantity Int
  isActive      Boolean  @default(true)
  expiresAt     DateTime
  coupons       Coupon[]
}

model Coupon {
  id          Int      @id @default(autoincrement())
  campaignId  Int
  userId      Int?     // 발급받은 유저 (null이면 미발급)
  pinCode     String   @unique // 바코드용 난수
  isUsed      Boolean  @default(false)
  issuedAt    DateTime?
  usedAt      DateTime?
}

// UGC 제재 및 신고 테이블
model Report {
  id          Int      @id @default(autoincrement())
  reporterId  Int      // 신고자
  courseId    Int      // 신고당한 코스
  reason      String   // 신고 사유
  status      String   // PENDING, RESOLVED, DISMISSED
  createdAt   DateTime @default(now())
}
```

---

## 5. API 설계 보강 (Admin 연동)

### Front-end API (추가)
*   `GET /api/rewards/my-coupons` : 마이페이지 쿠폰 지갑 조회
*   `POST /api/reports` : 특정 코스/유저 신고 접수

### Backoffice API (Admin 권한 인가 필요 JWT)
*   `GET /api/admin/dashboard/stats` : 주요 KPI 지표 리턴
*   `GET /api/admin/places?status=duplicate` : 병합(Merge) 의심되는 장소 리스트 리턴
*   `PATCH /api/admin/places/{id}/merge` : 장소 중복 데이터 병합 처리
*   `POST /api/admin/campaigns` : 신규 제휴/보상 캠페인 및 쿠폰 벌크 등록
*   `PATCH /api/admin/courses/{id}/visibility` : 특정 코스 숨김/노출 토글
*   `PUT /api/admin/translations/{course_node_id}` : 기계 번역된 결과물 수동 오버라이드 수정
