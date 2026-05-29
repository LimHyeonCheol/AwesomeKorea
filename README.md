# AwesomeKorea

대한민국 콘텐츠에 대한 해외 유튜브 리액션을 카테고리별로 빠르게 탐색하는 MVP 프로젝트입니다.  
초기 카테고리는 `영화`, `드라마`, `만화`, `노래`이며, 추후 예능/게임/스포츠 등으로 쉽게 확장할 수 있도록 설계합니다.

현재 저장소는 `Phase 1.1 프로젝트 초기 세팅`과 `Phase 1.2 D1 스키마 및 시드 데이터`까지 반영된 상태입니다.

## 프로젝트 목표

- 사용자가 해외 반응이 많은 한국 콘텐츠를 한눈에 본다.
- 카테고리별로 인기 콘텐츠를 빠르게 탐색한다.
- 콘텐츠 상세에서 관련 리액션 영상을 `최신순`, `인기순`으로 정렬해 본다.
- Cloudflare 중심으로 빠르게 배포 가능한 MVP를 만든다.

## 디자인 기준

`docs` 폴더의 시안 기준으로 아래 경험을 MVP 핵심으로 본다.

- 상단 브랜드/카테고리/정렬 탭
- 실시간 배너 또는 하이라이트 영역
- 이번 주 TOP 10 랭킹
- 카테고리별 인기 카드 그리드
- 콘텐츠 상세 진입 시 리액션 영상 목록
- 콘텐츠 상세 안에서 유튜브 영상을 바로 볼 수 있는 인라인 재생 영역

## 추천 기술 스택

### 최종 선택

- Frontend: `React + Vite + TypeScript`
- UI: `Tailwind CSS`
- API: `Hono + TypeScript`
- DB: `Cloudflare D1`
- Cache: `Cloudflare KV`
- Batch/수집: `Cloudflare Workers Cron`
- Deploy:
  - Web: `Cloudflare Pages`
  - API/Batch: `Cloudflare Workers`

### 이 스택을 선택한 이유

1. `TypeScript` 단일 언어로 프론트/백엔드/배치까지 통일 가능
2. `React`는 인력 수급, 생태계, 유지보수성 면에서 가장 무난하고 확장성이 높음
3. `Vite`는 초기 세팅과 빌드 구성이 단순해서 MVP 속도가 빠름
4. `Hono`는 Cloudflare Workers에 최적화되어 있고 라우팅/미들웨어가 가볍다
5. `D1`은 별도 DB 서버 운영 없이도 정렬, 필터, 집계가 가능해서 MVP에 적합
6. `KV`로 랭킹/홈 데이터를 캐시하면 응답 속도와 API 비용을 함께 줄일 수 있음

### 선택하지 않은 안

- `Next.js`
  - 확장성은 충분하지만, 현재 요구사항은 SEO 중심 SSR보다 빠른 MVP와 Cloudflare 친화성이 더 중요함
  - MVP 단계에서는 `React + Vite + Hono`가 구조가 단순하고 배포 동선이 짧음
- `Firebase/Supabase`
  - 빠르게 시작할 수는 있지만 이번 프로젝트는 Cloudflare 배포 중심이므로 운영 포인트를 줄이기 위해 Cloudflare 스택으로 통일

## MVP 범위

### 포함

- 카테고리 4종: 영화, 드라마, 만화, 노래
- 홈 화면 랭킹/인기 목록
- 카테고리 필터
- 콘텐츠 상세 화면
- 콘텐츠 상세 내 유튜브 인라인 재생
- 리액션 영상 `최신순`, `인기순` 정렬
- 주기적 데이터 수집 및 캐시

### 제외

- 관리자 웹 콘솔
- 회원가입/로그인
- 개인화 추천
- 다국어 UI
- 복잡한 검색 엔진

## 데이터 전략

MVP에서는 DB를 사용하는 쪽이 더 적합합니다.

- 이유 1: 카테고리별 정렬과 콘텐츠별 집계가 필요함
- 이유 2: 최신순/인기순을 안정적으로 제공하려면 SQL 정렬이 단순하고 빠름
- 이유 3: 추후 카테고리 확장, 수집 정확도 개선, 랭킹 스냅샷 저장에 유리함

초기에는 아래 방식으로 단순하게 시작합니다.

- 콘텐츠 마스터 데이터는 운영자가 직접 등록
- YouTube Data API로 리액션 영상 수집
- Cron Worker가 주기적으로 수집/정제/적재
- 홈 랭킹 데이터는 KV 캐시

## 핵심 사용자 흐름

1. 사용자가 홈에서 이번 주 TOP 10을 본다.
2. 카테고리를 선택해 인기 콘텐츠를 좁혀 본다.
3. 콘텐츠를 클릭해 관련 리액션 영상을 확인한다.
4. `최신순` 또는 `인기순`으로 정렬한다.
5. 상세 페이지 안에서 YouTube 영상을 바로 재생한다.

## 배포 구조

- `Cloudflare Pages`: 정적 웹 배포
- `Cloudflare Workers`: API + 배치 작업
- `Cloudflare D1`: 콘텐츠/영상/랭킹 메타데이터 저장
- `Cloudflare KV`: 홈/카테고리 캐시 저장

## 추천 레포 구조

```text
apps/
  web/        # React + Vite + Tailwind v4
  api/        # Hono Worker + D1 + KV
packages/
  shared/     # 타입, 공통 유틸, DTO
docs/
  MVP-설계안.md
```

## 현재 구현 범위

### Phase 1.1 완료

- npm workspace 기반 모노레포 구성
- `apps/web`, `apps/api`, `packages/shared` 분리
- `React + Vite + TypeScript` 웹 앱 기본 구조 생성
- `Hono + Cloudflare Workers` API 기본 구조 생성
- 공통 카테고리/도메인 타입 패키지 구성
- `wrangler.jsonc`와 로컬 실행용 기본 스크립트 추가

### Phase 1.2 완료

- D1 초기 스키마 작성
- 카테고리/콘텐츠/채널/리액션/랭킹 스냅샷 시드 데이터 추가
- `GET /api/categories`
- `GET /api/home`
- `GET /api/contents`
- `GET /api/contents/:slug`
- `GET /api/contents/:slug/reactions`

## 빠른 시작

### 1. 의존성 설치

```bash
npm install
```

### 2. 로컬 D1 스키마 적용

```bash
npm run db:migrate:local
npm run db:seed:local
```

### 3. API 실행

```bash
npm run dev:api
```

### 4. 웹 실행

```bash
npm run dev:web
```

## 환경 변수

`apps/api/.dev.vars.example`를 참고해 아래 값을 준비합니다.

- `YOUTUBE_API_KEY`
- `INTERNAL_API_TOKEN`

`apps/api/wrangler.jsonc`의 D1/KV 식별자는 Cloudflare 실제 리소스 값으로 교체해야 합니다.

## MVP 개발 일정 제안

1. Day 1: 프로젝트 세팅, D1 스키마, 시드 데이터
2. Day 2: YouTube 수집 Worker, 랭킹 집계 API
3. Day 3: 홈/카테고리/상세 UI 구현
4. Day 4: 정렬, 캐시, 배포, QA

정상적으로 진행되면 4일~6일 내 첫 MVP 공개가 가능합니다.

## 다음 단계

- `Phase 1.3`: 실제 홈/카테고리/상세 화면에 API 연동
- `Phase 1.4`: 콘텐츠 상세 인라인 유튜브 임베드 연결
- `Phase 1.5`: YouTube 수집 Cron Worker와 KV 캐시 연동

## 상세 설계

상세 설계서는 아래 문서를 참고합니다.

- [MVP-설계안](./docs/MVP-설계안.md)
