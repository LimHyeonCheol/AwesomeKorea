# YouTube 429 원인과 개선안

## 1. 문서 목적

운영에서 발생한 YouTube `429 Quota exceeded` 이슈를 기준으로,

- 자동수집을 어디서 막아야 하는지
- 수동수집 1회가 왜 과다한 `search.list` 호출로 이어지는지
- 어떤 순서로 수정해야 빠르게 안정화되는지

를 정리한다.

이 문서는 현재 저장소 코드 기준의 내부 운영 문서다.

## 2. 문제 요약

### 증상

- 운영 수동수집에서 `YouTube API 요청 실패: 429` 발생
- 에러 본문에는 `quota metric 'Search Queries'` 와 `Search Queries per day` 초과가 표시됨
- 실제 실패 지점은 `youtube/v3/search` 호출이다

### 현재 코드에서 확인된 사실

- 동기화 로직은 `search.list` 와 `videos.list` 를 사용한다
- 실패는 `videos.list` 가 아니라 `search.list` 에서 발생한다
- `limitPerKeyword` 는 `maxResults` 만 줄일 뿐, `search.list` 요청 횟수 자체는 줄이지 못한다
- 자동수집 경로가 수동수집과 같은 `syncYoutubeReactions()` 를 공유한다

## 3. 공식 쿼터 기준

공식 문서 기준으로 YouTube Data API는 다음 제약을 가진다.

- `search.list` 는 별도 `Search Queries` 버킷을 사용한다
- 기본 한도는 하루 `100 search.list calls`
- `search.list` 는 호출 1회당 버킷 1회를 소모한다
- `commentThreads.list`, `comments.list` 등은 별도 일반 쿼터를 사용하며 이번 에러의 직접 원인은 아니다

공식 참고 문서:

- [Quota Calculator](https://developers.google.com/youtube/v3/determine_quota_cost)
- [Quota and Compliance Audits](https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits)
- [Search: list](https://developers.google.com/youtube/v3/docs/search/list)
- [CommentThreads: list](https://developers.google.com/youtube/v3/docs/commentThreads/list)
- [Comments: list](https://developers.google.com/youtube/v3/docs/comments/list)

## 4. 자동수집 경로

자동수집은 한 군데가 아니라 두 군데다.

### 4.1 Cron 수집

파일:

- `apps/api/wrangler.jsonc`
- `apps/api/src/index.ts`

현재 상태:

- `wrangler.jsonc` 에 cron 트리거가 등록되어 있다
- `scheduled` 핸들러가 시간마다 `syncYoutubeReactions()` 를 실행한다

영향:

- 운영자가 수동수집을 하지 않아도 `search.list` 버킷이 계속 소모될 수 있다
- 수동수집과 cron 이 같은 시점에 겹치면 중복 소모가 발생할 수 있다

### 4.2 Bootstrap 수집

파일:

- `apps/api/src/services/bootstrap-service.ts`
- `apps/api/src/index.ts`

현재 상태:

- 공개 API 진입 시 `ensureBootstrapContentData()` 가 먼저 호출된다
- `reaction_videos` 가 비어 있으면 bootstrap sync 가 자동 실행된다

영향:

- 운영자는 수집을 실행하지 않았다고 느껴도, 공개 API 접근만으로 수집이 시작될 수 있다
- 초기 데이터가 비어 있는 환경이나 리셋 직후 환경에서 특히 위험하다

### 4.3 즉시 차단 포인트

자동수집을 우선 막으려면 아래 둘 다 막아야 한다.

1. `scheduled` 핸들러에서 `syncYoutubeReactions()` 호출 제거 또는 feature flag 가드 추가
2. `ensureBootstrapContentData()` 에서 YouTube sync 진입 차단

cron 만 막고 bootstrap 을 남기면 공개 API 트래픽으로 다시 버킷이 소모될 수 있다.

## 5. 과다사용의 실제 원인

핵심은 `수동수집 1회 = search.list 1회` 가 아니라는 점이다.

### 5.1 콘텐츠 1건당 검색어가 너무 많다

파일:

- `apps/api/src/services/youtube-reaction-matcher.ts`

현재 동작:

- `buildSearchKeywords()` 가 검색어를 만들고
- 최종적으로 최대 `8개` 까지 반환한다

문제:

- `searchKeywords` 에 이미 운영자가 직접 넣은 검색어가 있어도
- 제목, 영문 제목, alias, 한글 alias 를 기준으로 자동 생성 검색어를 계속 추가한다

실제 재현:

- `call-of-duty-modern-warfare-4` 는 1회 수동수집에서 검색어가 8개 생성됐다
- 즉, 콘텐츠 1건만 수집해도 `search.list` 를 최대 8번 호출한다

예시:

- `"Call of Duty: Modern Warfare 4" reaction game`
- `"COD MW4" reaction`
- `"Modern Warfare 4" trailer reaction`
- `"call of duty modern warfare 4" reaction game`
- `"call of duty modern warfare 4" first time watching game`
- `콜 오브 듀티 모던 워페어 4 reaction`
- `콜 오브 듀티 모던 워페어 4 해외반응`
- `모던 워페어 4 reaction`

### 5.2 `limitPerKeyword` 는 검색 횟수를 줄이지 않는다

파일:

- `apps/api/src/services/youtube-sync-service.ts`

현재 동작:

- `limitPerKeyword` 는 각 검색어당 `maxResults` 값으로만 들어간다
- 검색어가 8개면 `limitPerKeyword=1` 이어도 `search.list` 는 8번 호출된다

즉:

- `limitPerKeyword` 를 낮추는 것은 응답 건수 절감이지
- `Search Queries` 버킷 절감이 아니다

이 값만 조정해서는 429 문제가 해결되지 않는다.

### 5.3 전체 active 콘텐츠를 매번 처음부터 다시 돈다

파일:

- `apps/api/src/services/youtube-sync-service.ts`
- `apps/api/src/repositories/catalog-repository.ts`

현재 동작:

- `getActiveContentsForSync()` 가 active 콘텐츠 전체를 가져온다
- cron 수집은 이 목록을 매 실행마다 다시 돈다

문제:

- 이미 최근에 수집한 콘텐츠도 다시 `search.list` 대상이 된다
- 콘텐츠별 마지막 수집 시각, 마지막 검색 시각, stale 여부 판단이 없다

### 5.4 운영자 입력 검색어와 자동 생성 검색어가 중복된다

현재 구조는 다음 순서다.

1. 운영자가 저장한 `searchKeywords` 를 먼저 사용
2. 그 뒤 제목, 영문 제목, alias 기준으로 자동 검색어를 추가
3. 중복 제거 후 최대 8개만 사용

문제:

- 운영자가 이미 좋은 검색어 2~3개를 넣어도
- 코드가 자동 검색어를 더 붙여 쿼터를 소비한다
- 특히 영어 제목, 소문자 영어 제목, 한글 제목, 축약어가 함께 있을 때 과다 호출이 심해진다

### 5.5 429 이후 전체 작업을 즉시 중단하지 않는다

파일:

- `apps/api/src/services/youtube-sync-service.ts`

현재 동작:

- 콘텐츠별로 `try/catch` 가 감싸져 있다
- 한 콘텐츠에서 429 가 나면 그 콘텐츠만 skip 처리하고 다음 콘텐츠로 넘어간다

문제:

- 이미 버킷이 소진된 상태에서도 남은 콘텐츠가 계속 시도된다
- quota 가 돌아오지 않는 동일 작업을 반복하면서 실패 로그만 늘어난다

### 5.6 수동수집, 내부수집, cron 사이의 동시 실행 방지가 없다

파일:

- `apps/api/src/index.ts`

현재 상태:

- 관리자 수동수집
- 내부 `/internal/sync/youtube`
- cron 수집

이 모두 같은 함수로 바로 들어간다.

문제:

- 실행 락이 없다
- 같은 시간대에 여러 경로가 겹치면 중복 호출이 가능하다

## 6. 원인 요약

이번 429 이슈의 핵심 원인은 아래 조합이다.

1. `search.list` 버킷이 작다
2. 콘텐츠 1건당 검색어가 최대 8개다
3. 자동수집이 전체 active 콘텐츠를 반복 순회한다
4. stale 체크가 없다
5. 수동/cron/내부 경로 간 동시 실행 방지가 없다
6. 429 이후 글로벌 중단이 없다

즉, 지금 구조는 `search.list` 버킷을 아껴 쓰는 구조가 아니라 `여러 검색어를 넓게 뿌리는 구조` 다.

## 7. 권장 대응안

### 7.1 Phase 0: 즉시 안정화

목표:

- 자동 버킷 소모 즉시 중단
- 운영 수동수집만 남기기

권장 조치:

1. cron 수집 비활성화
2. bootstrap 수집 비활성화
3. 429 발생 시 남은 콘텐츠 루프 즉시 중단
4. 수동수집만 허용

권장 구현 방식:

- `YOUTUBE_SYNC_CRON_ENABLED`
- `YOUTUBE_SYNC_BOOTSTRAP_ENABLED`

같은 env flag 를 추가하고 기본값을 `false` 로 둔다.

### 7.2 Phase 1: 검색어 수 축소

목표:

- 콘텐츠 1건당 `search.list` 횟수를 8회에서 1~2회 수준으로 줄이기

권장 조치:

1. 운영자 `searchKeywords` 가 있으면 자동 생성 검색어를 끈다
2. 자동 생성이 필요해도 최대 1~2개만 허용한다
3. alias 전체 순회 대신 우선순위가 가장 높은 alias 1개만 사용한다
4. 한글 fallback 검색어는 필요한 카테고리에서만 허용한다

권장 우선순위:

1. 운영자 `searchKeywords` 첫 번째 값
2. 운영자 `searchKeywords` 두 번째 값
3. 운영자 값이 없을 때만 `titleEn exact phrase + category hint`
4. 그래도 없으면 한글 fallback 1개

### 7.3 Phase 2: 증분 수집으로 변경

목표:

- 이미 수집한 콘텐츠를 매번 다시 검색하지 않기

권장 조치:

1. 콘텐츠별 `last_youtube_synced_at` 저장
2. 콘텐츠 수정 시에만 다시 전체 검색
3. reaction video 가 이미 충분한 콘텐츠는 일정 기간 동안 skip
4. 수동수집에만 `force` 옵션 허용

권장 기준 예시:

- 최근 24시간 내 sync 완료 콘텐츠는 자동수집 skip
- 최근 7일 내 reaction video 가 갱신된 콘텐츠는 자동수집 skip
- 운영자가 수정한 콘텐츠만 우선 재수집

### 7.4 Phase 3: 실행 락과 서킷 브레이커

목표:

- 중복 실행 방지
- quota 소진 시 불필요한 재시도 중단

권장 조치:

1. KV 또는 D1 기반 job lock 추가
2. `youtube_sync` 실행 중이면 두 번째 요청 거절
3. 첫 429 발생 시 전체 run 중단
4. `quota_exhausted` 상태를 캐시에 저장해 같은 날 추가 실행을 막기

### 7.5 Phase 4: 관측성 강화

목표:

- 어떤 경로가 얼마나 `search.list` 를 쓰는지 보이게 만들기

권장 조치:

1. run 단위로 `searchRequestCount` 기록
2. `triggeredBy` 기록: `admin`, `cron`, `bootstrap`, `internal`
3. 콘텐츠별 실제 검색어 목록 저장
4. 429 발생 시 마지막 검색어와 콘텐츠 slug 기록

## 8. 권장 구현 순서

가장 안전한 순서는 아래다.

1. 자동수집 차단
2. 429 시 전체 중단
3. 콘텐츠당 검색어 수 1~2개로 축소
4. 운영자 `searchKeywords` 우선 정책 도입
5. stale 체크 추가
6. job lock 추가

이 순서가 좋은 이유:

- 먼저 버킷 누수를 멈추고
- 다음으로 수동수집 1회의 비용을 줄이고
- 마지막에 구조 개선으로 안정화할 수 있기 때문이다

## 9. 권장 코드 변경 포인트

### 자동수집 차단

- `apps/api/src/index.ts`
  - `scheduled` 핸들러 가드 추가 또는 제거
- `apps/api/wrangler.jsonc`
  - cron trigger 제거 또는 배포 환경에서 제외
- `apps/api/src/services/bootstrap-service.ts`
  - bootstrap sync 가드 추가

### 검색어 축소

- `apps/api/src/services/youtube-reaction-matcher.ts`
  - `buildSearchKeywords()` 정책 단순화
  - `slice(0, 8)` 을 단순 축소하는 수준이 아니라 생성 전략 자체를 바꾸기

### 증분 수집

- `apps/api/src/repositories/catalog-repository.ts`
  - 마지막 sync 시각 저장/조회 로직 추가
- `apps/api/src/services/youtube-sync-service.ts`
  - stale 콘텐츠만 대상으로 필터링

### 실행 보호

- `apps/api/src/services/youtube-sync-service.ts`
  - quota 에러 서킷 브레이커 추가
- 별도 lock service 또는 KV key 추가

## 10. 결론

자동수집 문제는 비교적 단순하다.

- cron
- bootstrap

이 두 경로를 막으면 된다.

반면 과다사용 문제는 단순히 `limitPerKeyword` 값을 낮추는 것으로 해결되지 않는다.

실제 문제는 다음이다.

- 검색어를 너무 많이 만든다
- 전체 콘텐츠를 너무 자주 다시 검색한다
- 이미 quota 가 소진된 뒤에도 계속 시도한다
- 동시 실행 방지가 없다

따라서 운영 안정화를 위해서는

1. 자동수집 차단
2. 검색어 수 축소
3. stale 기반 증분 수집
4. 429 서킷 브레이커
5. 실행 락

순서로 정리해서 대응하는 것이 맞다.
