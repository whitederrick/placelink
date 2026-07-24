> ⚠️ **[ARCHIVED] 이 문서는 기획 참고 자료입니다.** 여기 나오는 확장 기능(AR, 실시간 동시 편집, 파트너 포털, MSA 등)은 대부분 [place-link_architecture_baseline.md](../place-link_architecture_baseline.md)의 "보류 목록"에 해당합니다. 충돌하는 내용은 정본(baseline + [development_guide](../place-link_development_guide.md))을 따릅니다.

# 🚀 place-link: 궁극의 확장형 시스템 분석 및 개발 설계서 v3.0 (프론트/백오피스/파트너 통합)

본 문서는 서비스의 현재(초기 런칭)뿐만 아니라, 미래의 비즈니스 확장(AI 연동, 커뮤니티, B2B 제휴, 커머스/예약)까지 모두 고려하여 작성된 **초정밀/풀스택 Technical PRD**입니다. AI 에이전트(Claude, Cursor 등)에게 전달 시 복잡한 마이크로서비스 아키텍처(MSA) 및 다기능 프론트엔드 모듈을 설계할 수 있는 기준이 됩니다.

---

## 1. 플랫폼 비전 및 아키텍처 확장 전략
*   **3-Tier 플랫폼 전략:**
    1.  **B2C (User):** MZ 커플 및 글로벌 관광객을 위한 초개인화 데이트/로컬 투어 앱.
    2.  **B2B (Partner):** 로컬 상권 소상공인, 팝업스토어 주최사가 직접 마케팅하는 파트너 포털.
    3.  **Admin (운영):** 전체 생태계를 관제하고 AI 기반으로 콘텐츠를 필터링/추천하는 중앙 통제실.
*   **핵심 추가 기술 요건:**
    *   **AI & LLM:** 유저 프롬프트 기반 코스 자동 생성, 리뷰 감정 분석, 다국어 실시간 완벽 번역.
    *   **Real-time Collaboration:** 커플 간 동시 코스 편집 (WebSockets/Socket.io 활용).
    *   **Location-based Tech:** GPS 기반 매장 체크인, AR(증강현실) 도보 네비게이션 연동(글로벌 유저 타겟).

---

## 2. 사용자(Front-end) 초정밀 화면 및 기능 정의

기존 기능을 고도화하고, 소셜/커뮤니티 및 유틸리티 기능을 대폭 추가합니다.

### 2.1. 홈 & 탐색 (Home & Explore)
*   **AI 초개인화 피드 (For You):**
    *   유저의 과거 스크랩, 클릭한 해시태그, 현재 위치/날씨를 분석한 머신러닝 추천 알고리즘 적용 피드.
*   **라이브 히트맵 (Live Heatmap) 탐색:**
    *   지도 뷰에서 현재 시간대 사람들이 가장 많이 조회/스크랩하고 있는 지역(성수, 홍대 등)을 시각적인 히트맵으로 제공.
*   **AR 뷰 (글로벌 모드 전용):**
    *   카메라 뷰어 위에 장소 방향과 거리, 별점을 오버레이(Overlay)로 띄워주는 AR 길찾기 기능 (웹 XR API 활용).

### 2.2. 코스 생성 마법사 (Pro-Creator Mode)
*   **기능 1: AI 프롬프트 생성 (매직 완드):**
    *   입력란에 "이번 주말 비오는데, 예산 10만원 안으로 조용히 책 읽기 좋은 연남동 데이트 코스 짜줘" 라고 입력 시 LLM이 장소 3~4곳을 즉시 매핑하여 코스 초안 생성.
*   **기능 2: 커플 동시 편집 (Co-Editing):**
    *   Google Docs처럼 커플이 각각 접속하여 실시간으로 장소를 추가/삭제하고 마우스 커서가 보이는 동시 편집 기능.
*   **기능 3: 스마트 동선 최적화 알고리즘:**
    *   장소 5개를 무작위로 넣었을 때, "TSP(외판원 순회 문제) 알고리즘"을 적용하여 걷기 가장 편한 순서로 자동 재정렬 버튼 제공.

### 2.3. 커뮤니티 & 소셜 네트워크 (Social Graph)
*   **워너비 커플 팔로우 시스템:**
    *   취향이 비슷한 다른 커플(크리에이터)을 팔로우하고, 그들이 새 코스를 올리면 푸시 알림 수신.
*   **코스 댓글 및 리액션:**
    *   코스 상세 페이지 내 "이 코스대로 다녀왔어요!" (Photo 리뷰) 댓글 기능. 
    *   다양한 리액션 이모지(🔥, ❤️, 💡, 💸) 남기기.
*   **커뮤니티 Q&A 라운지:**
    *   "1주년 식당 추천 좀", "이번 주말 성수동 주차 꿀팁" 등 커플 간 익명/실명 질문-답변 게시판.

### 2.4. 커플 유틸리티 (My Page 확장)
*   **커플 다이어리 & 캘린더:**
    *   다녀온 코스를 캘린더 형태의 '데이트 아카이브'로 시각화.
    *   사진첩 연동 기능 (월별 하이라이트 자동 생성).
*   **데이트 가계부 (Budget Tracker):**
    *   코스별로 실제 지출한 금액을 입력하면, 월간 데이트 비용 통계 및 또래 커플 평균 지출액과 비교 리포트 제공.
*   **게이미피케이션 (업적 & 레벨):**
    *   코스 생성, GPS 체크인, 스크랩 수 등에 따라 경험치(XP) 획득.
    *   칭호 부여 (예: '성수동 앰배서더', '미식 탐험가') 및 프로필 뱃지 전시.

### 2.5. 커머스 & 예약 (Monetization)
*   **인앱(In-App) 예약 연동:**
    *   캐치테이블, 네이버 예약 API 등과 연동하여 코스 내 식당/전시를 앱 이탈 없이 즉시 예약.
*   **티켓/바우처 구매:**
    *   제휴 팝업스토어의 'Fast Track(우선 입장권)' 또는 할인가 바우처를 포인트나 결제를 통해 즉시 구매 후 QR 코드로 사용.

---

## 3. 파트너 포털 (B2B 제휴사 전용 웹) 설계

로컬 상권의 사장님들이 직접 마케팅할 수 있는 셀프 서브(Self-serve) 플랫폼입니다.

*   **비즈니스 인증 (Claim Business):** 사업자 등록증을 통해 특정 장소(POI)의 관리 권한 획득.
*   **프로모션/쿠폰 직접 발행:**
    *   파트너가 직접 "비오는 날 한정 아메리카노 50% 할인" 쿠폰을 생성하여 타겟팅 발송.
*   **로컬 타겟팅 광고 (Ads):**
    *   유저가 해당 상권(예: 한남동) 지도를 탐색할 때 자사 매장을 '스폰서 마커(Sponsor Marker)'로 강조 표시하는 광고 구좌 입찰.
*   **파트너 인사이트 대시보드:**
    *   우리 매장이 포함된 코스의 스크랩 수, 유저 성별/연령대 통계, 방문 전환율(GPS 체크인 기준) 리포트 제공.

---

## 4. 시스템 관리자 (Backoffice) 고도화 기능

단순 CRUD를 넘어선 고도화된 관제 시스템입니다.

*   **CRM 및 타겟팅 푸시 엔진:**
    *   **세그먼트 빌더:** "최근 2주 내 성수동 코스를 스크랩했지만 다녀오지 않은 유저", "가입 후 코스 생성이 없는 유저" 등 세밀한 조건으로 유저 그룹핑.
    *   개인화 푸시 알림 및 이메일/알림톡 발송 (예: "지훈님, 스크랩해둔 성수동 팝업이 내일 종료돼요!").
*   **AI 콘텐츠 모더레이션 (Auto-Moderation):**
    *   AWS Rekognition / Google Vision API를 연동하여 유저가 업로드한 사진의 유해성(음란, 폭력, 타 브랜드 노출) 자동 판별 및 블라인드 처리.
    *   비속어/광고성 텍스트 딥러닝 필터링 및 어뷰징 유저 자동 쉐도우 밴(Shadow Ban).
*   **A/B 테스트 관제 (Feature Flags):**
    *   프론트엔드의 특정 UI/로직(예: 코스 생성 버튼 색상, 추천 알고리즘 A/B 모델)을 배포 없이 서버에서 On/Off 하거나 트래픽 분배율(예: 50% vs 50%)을 조절하는 패널.

---

## 5. 확장된 데이터베이스 스키마 (Prisma ORM 기반)

방대한 기능을 수용하기 위한 엔터프라이즈급 스키마 설계입니다.

```prisma
// ------------------------------------
// 1. Users, Couples & Social
// ------------------------------------
model User {
  id             Int       @id @default(autoincrement())
  email          String    @unique
  nickname       String
  level          Int       @default(1)
  xp             Int       @default(0)
  createdAt      DateTime  @default(now())
  followers      Follow[]  @relation("Follower")
  following      Follow[]  @relation("Following")
  comments       Comment[]
  bookings       Booking[]
}

model Follow {
  id          Int      @id @default(autoincrement())
  followerId  Int      // 팔로우 하는 사람
  followingId Int      // 팔로우 받는 사람 (워너비)
  createdAt   DateTime @default(now())
  
  follower    User     @relation("Follower", fields: [followerId], references: [id])
  following   User     @relation("Following", fields: [followingId], references: [id])
  @@unique([followerId, followingId])
}

// ------------------------------------
// 2. Course, AI & Gamification
// ------------------------------------
model Course {
  id              Int       @id @default(autoincrement())
  creatorCoupleId Int
  title           String
  isAIGenerated   Boolean   @default(false) // AI로 생성된 코스인지 여부
  totalExpense    Int?      // 데이트 가계부 입력 총액
  viewCount       Int       @default(0)
  createdAt       DateTime  @default(now())
  comments        Comment[]
  nodes           Course_Node[]
}

model Comment {
  id        Int      @id @default(autoincrement())
  courseId  Int
  userId    Int
  content   String
  photoUrl  String?  // 사진 후기
  createdAt DateTime @default(now())
  
  course    Course   @relation(fields: [courseId], references: [id])
  user      User     @relation(fields: [userId], references: [id])
}

// GPS 체크인 기반 인증 내역
model CheckIn {
  id        Int      @id @default(autoincrement())
  userId    Int
  placeId   Int
  lat       Float
  lng       Float
  isValid   Boolean  // 실제 위치 반경 내에 있었는지 검증
  createdAt DateTime @default(now())
}

// ------------------------------------
// 3. B2B Partner & Monetization
// ------------------------------------
model Partner {
  id             Int       @id @default(autoincrement())
  businessNumber String    @unique
  ownerName      String
  placeId        Int       @unique // 연결된 내 매장 POI
  isVerified     Boolean   @default(false)
  adBudget       Int       @default(0) // 남은 광고 예산
  createdAt      DateTime  @default(now())
}

model Booking {
  id            Int      @id @default(autoincrement())
  userId        Int
  placeId       Int
  reservedDate  DateTime
  pax           Int      // 인원수
  status        String   // PENDING, CONFIRMED, CANCELLED, COMPLETED
  createdAt     DateTime @default(now())
  
  user          User     @relation(fields: [userId], references: [id])
}
```

---

## 6. 추가 API 엔드포인트 명세 (MSA 대비)

*   **AI Service API (Python/FastAPI 마이크로서비스 권장):**
    *   `POST /api/ai/generate-course` : (Body: `{ "prompt": "비오는 날 연남동...", "budget": 50000 }`) -> LLM 기반 코스 JSON 반환.
    *   `POST /api/ai/optimize-route` : (Body: `place_ids[]`) -> TSP 알고리즘 최적화 노드 순서 반환.
*   **Social & Community API:**
    *   `POST /api/users/{id}/follow` : 특정 유저 팔로우.
    *   `POST /api/courses/{id}/comments` : 사진 포함 댓글 작성.
*   **Partner (B2B) API:**
    *   `GET /api/partner/analytics/traffic` : 파트너의 장소가 노출/조회된 통계 데이터.
    *   `POST /api/partner/ads/campaign` : 지역 기반 노출 광고 생성.
*   **Booking API:**
    *   `POST /api/bookings` : 서드파티(캐치테이블 등) 예약 상태 연동 및 결제.
