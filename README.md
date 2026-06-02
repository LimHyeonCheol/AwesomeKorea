# AwesomeKorea

## 변경 이력

### v0.1.1 (2026-06-02)

- 홈 히어로 슬라이드가 활성화된 상태에서도 관리자 설정의 `heroTitle`, `heroDescription`이 항상 노출되도록 수정했습니다.
- 번역 스킵 규칙을 보강해 한글 고유명사가 일부 섞인 영어 중심 제목, 소개글, 댓글도 한국어 번역 대상으로 처리하도록 개선했습니다.

대한민국 콘텐츠에 대한 해외 유튜브 리액션을 카테고리별로 빠르게 탐색하는 MVP 프로젝트입니다.  
초기 카테고리는 `영화`, `드라마`, `만화`, `노래`이며, 추후 예능/게임/스포츠 등으로 쉽게 확장할 수 있도록 설계합니다.

현재 저장소는 `Phase 1.1~1.5` 기준으로 프로젝트 초기 세팅, D1 스키마/시드, YouTube sync 워커 구조, 캐시형 API, 실제 UI 연동까지 반영된 상태입니다.

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
- UI: `외부 CSS 아키텍처 + 공통 컴포넌트`
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
7. UI는 JSX 내부 인라인 스타일 대신 외부 CSS 디렉터리와 공통 컴포넌트로 유지보수성을 확보

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
  web/        # React + Vite + external CSS architecture
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

### Phase 1.3 완료

- `POST /internal/sync/youtube` 내부 동기화 엔드포인트 추가
- 콘텐츠별 YouTube 검색 키워드 생성 로직 추가
- 해외 반응 판별 휴리스틱 추가
- Worker `scheduled` 핸들러와 cron 트리거 구성
- 랭킹 재생성 서비스 추가

### Phase 1.4 완료

- 홈/목록/상세/리액션 API KV 캐시 적용
- 캐시 버전 갱신 전략 추가
- 상세 응답에 대표 리액션과 임베드 URL 포함
- 인라인 플레이어용 상세 응답 구조 정리

### Phase 1.5 완료

- 실제 API 연동 기반 홈 화면 구성
- 카테고리/정렬 탭 동작 구현
- 공통 `Header`, `Footer` 컴포넌트 분리
- 외부 CSS 디렉터리 구조 생성
- 하나의 동적 상세 오버레이 컴포넌트로 모든 콘텐츠 재사용
- 상세 인라인 YouTube 플레이어 연결

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

`docs/apikey.txt` 또는 저장소 루트의 `apikey.txt`가 있으면 `npm run dev:api` 실행 시 `apps/api/.dev.vars`로 자동 동기화됩니다.

### 4. 웹 실행

```bash
npm run dev:web
```

개발 중에는 `apps/web/vite.config.ts` 프록시 설정으로 `/api`, `/internal` 요청이 `http://127.0.0.1:9000`로 전달됩니다.

## 환경 변수

`apps/api/.dev.vars.example`를 참고해 아래 값을 준비합니다.

- `YOUTUBE_API_KEY`
- `INTERNAL_API_TOKEN`

로컬 개발은 `npm run dev:api` 또는 `npm run sync:api-key` 실행 시 `docs/apikey.txt`, `apikey.txt`, `YOUTUBE_API_KEY_FILE`, `YOUTUBE_API_KEY` 순서로 값을 찾아 `apps/api/.dev.vars`에 자동 반영합니다.

API 배포는 `npm run deploy:api`로 진행하면 `YOUTUBE_API_KEY`를 Cloudflare Worker secret으로 먼저 동기화한 뒤 바로 `wrangler deploy`까지 이어집니다.

`apps/api/wrangler.jsonc`의 D1/KV 식별자는 Cloudflare 실제 리소스 값으로 교체해야 합니다.

웹은 필요 시 `VITE_API_BASE_URL`로 별도 API 주소를 지정할 수 있습니다.

## 실배포 방법

### 1. Cloudflare 리소스 준비

최초 1회만 아래 명령으로 실제 D1/KV 리소스를 생성합니다.

```bash
wrangler d1 create awesome-korea
wrangler kv namespace create awesomekorea-content-cache
```

출력된 식별자를 환경 변수로 준비합니다.

- `CLOUDFLARE_D1_ID`
- `CLOUDFLARE_KV_ID`
- 선택: `CLOUDFLARE_D1_PREVIEW_ID`
- 선택: `CLOUDFLARE_KV_PREVIEW_ID`

`preview` 값이 따로 없으면 배포 스크립트가 운영 ID와 같은 값으로 채웁니다.

### 2. API Worker 배포

아래 값 중 하나로 YouTube 키를 준비합니다.

- `YOUTUBE_API_KEY`
- `YOUTUBE_API_KEY_FILE`
- 저장소 루트 `apikey.txt`
- `docs/apikey.txt`

내부 배치 API용 토큰은 아래 중 하나로 준비합니다.

- `INTERNAL_API_TOKEN`
- 기존 `apps/api/.dev.vars`
- 미지정 시 배포 스크립트가 강한 랜덤 토큰을 생성해 `apps/api/.dev.vars`에 저장

그 다음 API를 배포합니다.

```bash
npm run deploy:api
```

배포 스크립트는 아래를 자동으로 처리합니다.

- 로컬 `YOUTUBE_API_KEY` 동기화
- Worker secret `YOUTUBE_API_KEY` 업로드
- Worker secret `INTERNAL_API_TOKEN` 업로드
- `.wrangler/deploy.production.jsonc` 임시 설정 생성
- `APP_ENV=production` 기준 Worker 배포

### 3. Pages 웹 배포

API 배포 후 출력된 Worker URL을 `VITE_API_BASE_URL`로 지정합니다.

```bash
VITE_API_BASE_URL=https://awesomekorea-api.<your-subdomain>.workers.dev
npm run deploy:web
```

선택 환경 변수:

- `AWESOMEKOREA_PAGES_PROJECT`
  - 기본값: `awesomekorea-web`
- `AWESOMEKOREA_PAGES_BRANCH`
  - 기본값: `main`

웹 배포 스크립트는 프로젝트가 없으면 자동 생성 후 `dist`를 Cloudflare Pages에 업로드합니다.

### 4. 배포 검증

배포가 끝나면 아래를 확인합니다.

1. Worker 헬스체크: `GET https://<worker-url>/api/health`
2. Pages 접속: `https://<pages-project>.pages.dev`
3. 홈 화면 카드/랭킹 로딩
4. 콘텐츠 상세 진입 후 인라인 YouTube 플레이어 렌더링

## GitHub Actions 자동배포

현재 저장소는 Cloudflare Git 연동 대신 `GitHub Actions + Wrangler Direct Upload` 기준으로 자동배포하도록 구성했습니다.

### 워크플로 구성

- `.github/workflows/ci.yml`
  - PR / main 제외 브랜치 push 시 `typecheck + build`
- `.github/workflows/deploy-production.yml`
  - `main` push 또는 수동 실행 시
  - `typecheck -> build -> API 배포 -> API 스모크 테스트 -> Web 배포 -> Web 스모크 테스트`
- `.github/workflows/reset-remote-db.yml`
  - GitHub Actions 수동 실행 전용
  - `RESET` 입력 시 원격 D1 마이그레이션 + 시드 재적용
  - `seed.sql` 이 기존 데이터를 지우므로 운영 중에는 신중하게 사용

### GitHub Secrets

저장소 `Settings -> Secrets and variables -> Actions -> Secrets` 에 아래 값을 추가합니다.

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_D1_ID`
- `CLOUDFLARE_KV_ID`
- `YOUTUBE_API_KEY`
- 선택: `INTERNAL_API_TOKEN`

`INTERNAL_API_TOKEN` 을 비워두면 배포 워크플로가 실행 중 임시 토큰을 생성해 Worker secret으로 업로드합니다.  
다만 운영 안정성을 위해서는 고정값 secret 등록을 권장합니다.

### GitHub Variables

저장소 `Settings -> Secrets and variables -> Actions -> Variables` 에 아래 값을 추가하면 좋습니다.

- `CLOUDFLARE_D1_PREVIEW_ID`
  - 없으면 `CLOUDFLARE_D1_ID` 재사용
- `CLOUDFLARE_KV_PREVIEW_ID`
  - 없으면 `CLOUDFLARE_KV_ID` 재사용
- `AWESOMEKOREA_PAGES_PROJECT`
  - 기본값: `awesomekorea-web`
- `AWESOMEKOREA_PAGES_BRANCH`
  - 기본값: `main`
- `AWESOMEKOREA_WORKER_URL`
  - 기본값: `https://awesomekorea-api.awesomekorea-limhyeoncheol.workers.dev`

### 동작 방식

`main` 에 push 되면 아래 순서로 자동 반영됩니다.

1. 의존성 설치
2. 타입체크/빌드
3. `npm run deploy:api`
4. `scripts/smoke-deploy.mjs api` 로 Worker 헬스체크와 내부 엔드포인트 검증
5. `npm run deploy:web`
6. `scripts/smoke-deploy.mjs web` 로 Pages 루트/SPA 라우트 검증

### 로컬 스모크 테스트

자동배포와 같은 검증을 로컬에서도 실행할 수 있습니다.

```bash
SMOKE_API_BASE_URL=https://awesomekorea-api.awesomekorea-limhyeoncheol.workers.dev npm run smoke:api
SMOKE_WEB_BASE_URL=https://awesomekorea-web.pages.dev SMOKE_EXPECTED_API_BASE_URL=https://awesomekorea-api.awesomekorea-limhyeoncheol.workers.dev npm run smoke:web
```

## 프론트 구조 원칙

- 공통 레이아웃은 `apps/web/src/components/common`
- 홈 전용 UI는 `apps/web/src/components/home`
- 상세 인라인 플레이어 UI는 `apps/web/src/components/content`
- 외부 스타일은 `apps/web/src/styles`
- 상세 화면은 하나의 동적 오버레이 컴포넌트로 재사용

## MVP 개발 일정 제안

1. Day 1: 프로젝트 세팅, D1 스키마, 시드 데이터
2. Day 2: YouTube 수집 Worker, 랭킹 집계 API
3. Day 3: 홈/카테고리/상세 UI 구현
4. Day 4: 정렬, 캐시, 배포, QA

정상적으로 진행되면 4일~6일 내 첫 MVP 공개가 가능합니다.

## 다음 단계

- `Phase 1.6`: Cloudflare Pages/Workers 실배포 연결
- YouTube API 실키로 sync 검증
- UI QA와 반응형 보정
- 카테고리 확장 및 관리자 입력 동선 정리

## 상세 설계

상세 설계서는 아래 문서를 참고합니다.

- [MVP-설계안](./docs/MVP-설계안.md)
