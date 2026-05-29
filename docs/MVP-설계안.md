# AwesomeKorea MVP 설계안

## 1. 문서 목적

이 문서는 `AwesomeKorea`의 빠른 MVP 출시를 목표로 한 상세 설계서입니다.  
대상 서비스는 대한민국 콘텐츠에 대한 해외 유튜브 반응을 카테고리별로 모아 보여주는 사이트입니다.

## 2. 시안 해석

`docs` 내 시안 3장을 기준으로 MVP의 핵심 화면은 아래 3개입니다.

### 2.1 홈 화면

- 브랜드 영역
- 상단 정렬/카테고리 탭
- 실시간 배너
- 이번 주 TOP 10 랭킹

### 2.2 카테고리별 인기 영역

- 카테고리 필터: 전체, 영화, 드라마, 만화, 노래
- 콘텐츠 카드 그리드
- 카드 정보:
  - 카테고리명
  - 콘텐츠명
  - 리액션 개수
  - 조회수 또는 영상 수

### 2.3 콘텐츠 상세/오버레이

- 선택한 콘텐츠의 메타 정보
- 인라인 YouTube 플레이어
- 관련 리액션 영상 리스트
- 채널명
- 조회수
- 필요 시 외부 YouTube 이동 버튼

## 3. MVP 목표

### 3.1 비즈니스 목표

- 해외에서 반응이 큰 한국 콘텐츠를 빠르게 발견하게 한다.
- 특정 콘텐츠에 대한 해외 리액션 영상을 한 화면에서 모아 보여준다.
- 운영자가 적은 비용과 적은 공수로 계속 확장할 수 있게 한다.

### 3.2 제품 목표

- 첫 방문 5초 안에 인기 콘텐츠를 보여준다.
- 카테고리 전환이 빠르다.
- 최신순/인기순 정렬이 직관적이다.
- 콘텐츠 상세 진입 후 페이지 안에서 YouTube 영상을 바로 본다.
- 외부 YouTube 이동은 보조 수단으로만 제공한다.

## 4. 기술 스택 제안

### 4.1 최종 권장안

- Frontend: `React + Vite + TypeScript`
- Styling: `Tailwind CSS`
- Backend API: `Hono + TypeScript`
- Database: `Cloudflare D1`
- Cache: `Cloudflare KV`
- Scheduler: `Cloudflare Workers Cron`
- Hosting:
  - Web: `Cloudflare Pages`
  - API/Batch: `Cloudflare Workers`

### 4.2 선정 사유

#### TypeScript

- 프론트/백/API/배치를 한 언어로 묶을 수 있다.
- 추후 인력 확장과 코드베이스 유지보수에 유리하다.
- 사용자 관점에서 확장성이 낮은 선택지가 아니다.

#### React + Vite

- React는 채용/생태계/컴포넌트 자산 측면에서 가장 안전하다.
- Vite는 Next.js보다 설정과 런타임 구조가 단순해 MVP 속도가 빠르다.
- 현재 요구사항은 복잡한 SSR보다 빠른 인터랙션과 필터 UI가 더 중요하다.

#### Hono

- Cloudflare Workers와 궁합이 좋다.
- API 작성이 단순하고 빠르다.
- 추후 Edge API, 인증, 관리자 기능 추가도 무리 없다.

#### D1

- 정렬, 필터, 집계가 필요하므로 DB 없는 구조보다 안정적이다.
- 서버 운영 부담 없이 SQL 기반 조회를 구현할 수 있다.
- 콘텐츠/영상/랭킹 구조를 확장하기 쉽다.

#### KV

- 홈 랭킹과 카테고리 목록을 캐시하기 좋다.
- YouTube API 호출량과 응답 시간을 줄일 수 있다.

### 4.3 비교 검토

| 후보 | 장점 | 단점 | 결론 |
| --- | --- | --- | --- |
| React + Vite + Hono + D1 | Cloudflare 친화적, 빠른 MVP, TS 단일화 | SSR 기본 제공은 약함 | 최종 선택 |
| Next.js + Cloudflare | React 생태계, SSR/SEO 강점 | MVP 기준 배포/구조 복잡도 증가 | 추후 SEO 강화 시 검토 |
| Supabase 기반 | 빠른 CRUD | Cloudflare 중심 운영과 이원화 | 이번 요구엔 비권장 |
| DB 없이 JSON/KV만 사용 | 구현 단순 | 정렬/집계/확장성 한계가 빠르게 옴 | 초기 목업용까지만 적합 |

## 5. MVP 범위 정의

### 5.1 포함 기능

1. 홈 화면
2. 카테고리 탭
3. 이번 주 TOP 10
4. 카테고리별 인기 리스트
5. 콘텐츠 상세 화면
6. 콘텐츠 상세 내 유튜브 인라인 재생
7. 리액션 영상 최신순/인기순 정렬
8. 주기적 데이터 수집

### 5.2 제외 기능

1. 회원 기능
2. 댓글/좋아요
3. 관리자 UI
4. YouTube 임베드 외의 커스텀 자체 플레이어
5. 고급 검색
6. 추천 알고리즘 고도화

## 6. 정보 구조

### 6.1 라우트

- `/`
  - 홈
  - 이번 주 TOP 10
  - 카테고리별 인기
- `/category/:slug`
  - 선택 카테고리 인기 목록
  - 정렬: 인기순, 최신순
- `/content/:slug`
  - 콘텐츠 상세
  - 리액션 목록
  - 정렬: 인기순, 최신순

### 6.2 화면 공통 컴포넌트

- Header
- CategoryTabs
- SortTabs
- HeroTicker
- RankingList
- ContentCard
- ReactionVideoList
- EmptyState
- LoadingSkeleton

## 7. 데이터 모델

MVP에서도 최소한의 정렬/집계를 안정적으로 하려면 `D1` 사용을 권장합니다.

### 7.1 테이블

#### categories

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | integer | PK |
| slug | text | `movie`, `drama`, `webtoon`, `music` |
| name_ko | text | 영화, 드라마, 만화, 노래 |
| sort_order | integer | 노출 순서 |
| is_active | integer | 사용 여부 |

#### contents

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | integer | PK |
| category_id | integer | categories FK |
| slug | text | URL slug |
| title_ko | text | 한글 제목 |
| title_en | text | 영문 제목 |
| aliases_json | text | 검색용 별칭 배열 |
| release_year | integer | 출시 연도 |
| thumbnail_url | text | 대표 이미지 |
| description | text | 짧은 소개 |
| status | text | active, hidden |
| created_at | text | 생성일 |
| updated_at | text | 수정일 |

#### channels

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | integer | PK |
| youtube_channel_id | text | 채널 고유 ID |
| title | text | 채널명 |
| country_code | text | 국가 추정값 |
| default_language | text | 기본 언어 추정값 |
| is_korean_channel | integer | 한국 채널 여부 |

#### reaction_videos

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | integer | PK |
| youtube_video_id | text | 영상 고유 ID, 인라인 임베드 키 |
| content_id | integer | contents FK |
| channel_id | integer | channels FK |
| title | text | 영상 제목 |
| thumbnail_url | text | 썸네일 |
| published_at | text | 업로드 일시 |
| view_count | integer | 조회수 |
| like_count | integer | 좋아요 수 |
| comment_count | integer | 댓글 수 |
| detected_language | text | 언어 추정 |
| is_overseas_reaction | integer | 해외 리액션 여부 |
| youtube_url | text | 외부 링크 |
| created_at | text | 생성일 |
| updated_at | text | 수정일 |

#### ranking_snapshots

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | integer | PK |
| content_id | integer | contents FK |
| category_id | integer | categories FK |
| rank_type | text | weekly, popular |
| rank_value | integer | 순위 |
| reaction_count | integer | 리액션 개수 |
| total_views | integer | 합산 조회수 |
| snapshot_date | text | 스냅샷 기준일 |

### 7.2 왜 DB가 필요한가

- `최신순`: `published_at DESC`
- `인기순`: `view_count DESC` 또는 콘텐츠 단위 `SUM(view_count) DESC`
- `TOP 10`: 최근 7일 집계 후 `reaction_count DESC`, 동률 시 `total_views DESC`

JSON/KV만으로도 가능은 하지만, 집계와 정렬 요구가 이미 있어 DB가 없는 구조는 금방 유지보수 비용이 커집니다.

## 8. 데이터 수집 설계

### 8.1 데이터 소스

- `YouTube Data API v3`

### 8.2 수집 대상

- 운영자가 등록한 한국 콘텐츠 마스터 목록
- 각 콘텐츠의 한국어/영어 타이틀
- 검색용 별칭
- `reaction`, `review`, `first time watching`, `ending explained` 같은 보조 키워드

### 8.3 해외 반응 판별 MVP 규칙

정확한 국가 판별은 초기부터 100% 자동화하기 어렵기 때문에, MVP에서는 아래 휴리스틱으로 시작합니다.

1. 검색 키워드에 영어 리액션 패턴을 우선 사용
2. 한국어 제목만 있는 영상은 우선순위를 낮춤
3. 운영자가 지정한 한국 채널 블랙리스트를 제외
4. 채널 언어/국가 정보가 있으면 가산점 반영
5. 최종적으로 `is_overseas_reaction` 플래그를 저장

이 방식은 완벽하지 않지만 MVP 속도와 실효성 사이 균형이 좋습니다.

### 8.4 수집 주기

- 30분 또는 1시간 단위 Cron 실행

### 8.5 수집 처리 순서

1. 활성 콘텐츠 목록 조회
2. 콘텐츠별 검색 키워드 생성
3. YouTube API 조회
4. 중복 제거
5. 해외 반응 여부 판별
6. D1 upsert
7. 랭킹 집계 갱신
8. 홈/카테고리 캐시 갱신

## 9. 정렬 및 랭킹 정책

### 9.1 리액션 영상 정렬

- 최신순: `published_at DESC`
- 인기순: `view_count DESC`

### 9.2 콘텐츠 카드 정렬

- 인기순: 콘텐츠별 `SUM(view_count)` 내림차순
- 최신순: 가장 최근 리액션 영상의 `MAX(published_at)` 내림차순

### 9.3 이번 주 TOP 10

- 최근 7일간 생성된 리액션 영상 수 기준
- 동률이면 최근 7일 합산 조회수 기준

## 10. API 설계

### 10.1 Public API

#### `GET /api/home`

응답

- 실시간 배너 데이터
- 이번 주 TOP 10
- 카테고리별 인기 일부

#### `GET /api/categories`

응답

- 활성 카테고리 목록

#### `GET /api/contents`

쿼리

- `category`
- `sort=popular|latest`
- `page`
- `limit`

응답

- 콘텐츠 목록
- 집계값
- 페이지 정보

#### `GET /api/contents/:slug`

응답

- 콘텐츠 상세 메타 정보
- 대표 집계값

#### `GET /api/contents/:slug/reactions`

쿼리

- `sort=popular|latest`
- `page`
- `limit`

응답

- 리액션 영상 목록
- 페이지 정보
- `youtube_video_id` 기반 인라인 플레이어 연결 정보

### 10.2 Admin/Batch API

- `POST /internal/sync/youtube`
- `POST /internal/rankings/rebuild`

MVP에서는 외부 공개 없이 Worker 내부 또는 비밀 토큰 기반으로만 사용합니다.

## 11. 캐시 전략

### 11.1 KV 캐시 대상

- 홈 화면 응답
- 카테고리별 인기 목록 1페이지
- TOP 10 랭킹

### 11.2 TTL 제안

- 홈: 10분
- 카테고리 인기: 10분
- 상세 리액션 목록: 5분

## 12. 프론트엔드 구현 원칙

### 12.1 UI 원칙

- 시안과 동일하게 정보 밀도가 높은 카드 중심 레이아웃
- 모바일 우선
- 탭 전환 속도 우선
- 카드 클릭으로 상세 진입
- 외부 이동 버튼은 명확하게 표시

### 12.2 상태 관리

- 서버 상태: `TanStack Query`
- UI 상태: React 기본 상태

복잡한 전역 상태는 MVP에서 불필요합니다.

## 13. 추천 디렉터리 구조

```text
apps/
  web/
    src/
      components/
      pages/
      features/
      lib/
  api/
    src/
      routes/
      services/
      repositories/
      jobs/
packages/
  shared/
    src/
      types/
      constants/
      schemas/
docs/
  시안1.png
  시안2.png
  시안3.png
  MVP-설계안.md
```

## 14. 개발 우선순위

### Phase 1: 4일~6일 MVP

#### Phase 1.1 프로젝트 초기 세팅

- npm workspace 기반 모노레포 구성
- `apps/web`, `apps/api`, `packages/shared` 구조 생성
- `React + Vite + TypeScript` 웹 초기화
- `Hono + Wrangler` API 초기화
- Cloudflare 배포 전제 설정 파일 정리

상태: 완료

#### Phase 1.2 D1 스키마 및 시드 데이터

- `categories`, `contents`, `channels`, `reaction_videos`, `ranking_snapshots` 스키마 작성
- 로컬 D1 적용용 migration SQL 작성
- 시안 기반 샘플 콘텐츠/리액션/랭킹 seed SQL 작성
- 정렬/상세 검증용 기본 Public API 구현

상태: 완료

#### Phase 1.3 YouTube 수집 Worker

- YouTube Data API 검색 워커
- 콘텐츠별 검색 키워드 생성
- 해외 반응 판별 MVP 로직 적용

상태: 대기

#### Phase 1.4 홈 API/상세 API 고도화

- 홈 캐시 응답 구조 정리
- 카테고리/상세 API 응답 고도화
- 상세 페이지 인라인 플레이어 대응 응답 점검

상태: 일부 착수

#### Phase 1.5 홈/카테고리/상세 UI

- 실제 API 연동
- 탭 필터링
- 상세 오버레이 및 임베드 플레이어 연결

상태: 대기

#### Phase 1.6 배포 및 QA

- Cloudflare Pages/Workers 연결
- D1/KV 실 리소스 연결
- 배포 후 QA

상태: 대기

### Phase 2: 출시 직후

1. 관리자 등록 스크립트 개선
2. 해외 채널 판별 정확도 개선
3. 검색 기능 추가
4. SEO 보강

### Phase 3: 확장

1. 카테고리 추가
2. 국가별 필터
3. 언어별 필터
4. 알림/큐레이션

## 15. 리스크와 대응

### 리스크 1. 해외 반응 판별 정확도

- 대응: 블랙리스트/화이트리스트와 운영자 검수 포인트를 둔다.

### 리스크 2. YouTube API 할당량

- 대응: 콘텐츠 수를 제한해 시작하고, 캐시와 수집 주기를 조절한다.

### 리스크 3. 랭킹 신뢰도

- 대응: 초기에는 단순하고 설명 가능한 기준으로 운영한다.

## 16. 결론

이 프로젝트의 MVP는 `TypeScript + React/Vite + Hono + D1 + KV + Cloudflare` 조합이 가장 적합합니다.

- 빠르게 만들 수 있다.
- Cloudflare에 자연스럽게 배포된다.
- 사용자가 봐도 확장성이 낮아 보이지 않는다.
- 카테고리 추가, 랭킹 고도화, 관리자 기능 확장까지 무리 없이 이어갈 수 있다.

즉, `DB 없이 억지로 버티는 구조`보다 `D1을 포함한 단순한 Cloudflare 네이티브 구조`가 MVP 속도와 미래 확장성 모두에서 더 낫습니다.

## 17. 현재 산출물

이번 단계에서 실제 생성된 주요 파일은 아래와 같습니다.

- `package.json`
- `tsconfig.base.json`
- `apps/web/*`
- `apps/api/src/*`
- `apps/api/migrations/0001_initial.sql`
- `apps/api/seeds/seed.sql`
- `packages/shared/src/*`

즉, 설계만 있는 상태가 아니라 `Phase 1.1`과 `Phase 1.2`를 바로 이어서 개발할 수 있는 저장소 기본 골격과 D1 데이터 기반이 이미 만들어진 상태입니다.
