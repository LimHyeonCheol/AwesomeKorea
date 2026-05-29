import { MVP_CATEGORIES } from "@awesomekorea/shared";

import {
  flattenPopularCards,
  previewContentDetail,
  previewHomeData,
  previewReactions,
} from "./features/home/mock-data";

const formatCount = (value: number) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

const popularCards = flattenPopularCards(previewHomeData.popularByCategory).slice(0, 8);

export default function App() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f6_0%,#f7f7fb_55%,#eef2ff_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[32px] border border-rose-200 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="bg-[radial-gradient(circle_at_top_right,_rgba(251,191,36,0.25),_transparent_28%),linear-gradient(135deg,#be123c_0%,#9f1239_45%,#1d4ed8_100%)] px-6 py-6 text-white sm:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-lg font-semibold text-rose-700">
                  KR
                </div>
                <div className="space-y-2">
                  <p className="text-3xl font-black tracking-tight sm:text-4xl">어썸코리아</p>
                  <p className="max-w-2xl text-sm text-white/85 sm:text-base">
                    대한민국 콘텐츠에 대한 해외 유튜브 반응을 카테고리별로 빠르게 정리하는
                    Cloudflare 네이티브 MVP.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {MVP_CATEGORIES.map((category) => (
                  <button
                    key={category.slug}
                    className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/15"
                    type="button"
                  >
                    {category.nameKo}
                  </button>
                ))}
                <button
                  className="rounded-full border border-white/30 bg-white px-4 py-2 text-sm font-semibold text-rose-700"
                  type="button"
                >
                  최신 데이터 준비 완료
                </button>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-slate-950/25 px-4 py-3 text-sm text-white/90">
              <span className="mr-3 inline-flex rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-slate-900">
                실시간
              </span>
              {previewHomeData.hero?.message} -{" "}
              <span className="font-bold text-amber-300">{previewHomeData.hero?.titleKo}</span>
              {" "}리액션 {previewHomeData.hero?.reactionCount}개
            </div>
          </div>

          <div className="grid gap-8 px-6 py-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-500">
                    Phase 1.1
                  </p>
                  <h1 className="text-2xl font-black text-slate-950">이번 주 TOP 10</h1>
                </div>
                <p className="text-sm text-slate-500">
                  마지막 갱신 {new Date(previewHomeData.updatedAt).toLocaleString("ko-KR")}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {previewHomeData.top10.map((item) => (
                  <article
                    key={item.rank}
                    className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl font-black text-rose-600 shadow-sm">
                      {String(item.rank).padStart(2, "0")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-bold text-slate-900">{item.titleKo}</p>
                      <p className="text-sm text-slate-500">
                        {item.categoryNameKo} · 리액션 {item.reactionCount}개
                      </p>
                    </div>
                    <div className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                      {formatCount(item.totalViews)}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="space-y-4 rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#fff8f1_0%,#ffffff_100%)] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">
                    Phase 1.2
                  </p>
                  <h2 className="text-2xl font-black text-slate-950">{previewContentDetail.titleKo}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {previewContentDetail.categoryNameKo} · {previewContentDetail.releaseYear} ·
                    리액션 영상 {previewContentDetail.reactionCount}개
                  </p>
                </div>
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                  D1 Seed Preview
                </span>
              </div>

              <div className="aspect-video rounded-3xl border border-dashed border-slate-300 bg-[radial-gradient(circle_at_top_left,_rgba(190,24,93,0.12),_transparent_30%),linear-gradient(135deg,#fff1f2_0%,#ffffff_100%)] p-5">
                <div className="flex h-full flex-col justify-between rounded-[22px] bg-white/75 p-5 shadow-inner">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-rose-600">상세 페이지 인라인 재생 준비 영역</p>
                    <h3 className="text-xl font-black text-slate-950">
                      유튜브 임베드 슬롯은 Phase 1.3에서 연결
                    </h3>
                    <p className="text-sm leading-6 text-slate-600">
                      이번 단계에서는 디자인 시안과 데이터 구조를 맞추기 위해 상세 영역과
                      리액션 카드 구조를 먼저 고정했습니다.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {previewContentDetail.aliases.map((alias) => (
                      <span
                        key={alias}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600"
                      >
                        {alias}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {previewReactions.map((reaction, index) => (
                  <article
                    key={reaction.youtubeVideoId}
                    className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-600 text-sm font-bold text-white">
                      {index === 0 ? "R" : index === 1 ? "F" : "W"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">{reaction.title}</p>
                      <p className="text-sm text-slate-500">{reaction.channelName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-rose-600">{formatCount(reaction.viewCount)}</p>
                      <p className="text-xs text-slate-400">조회수</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Category Popular
              </p>
              <h2 className="text-2xl font-black text-slate-950">카테고리별 인기</h2>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                type="button"
              >
                전체
              </button>
              {MVP_CATEGORIES.map((category) => (
                <button
                  key={category.slug}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                  type="button"
                >
                  {category.nameKo}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {popularCards.map((item) => (
              <article
                key={item.slug}
                className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]"
              >
                <div className="flex h-44 items-center justify-center bg-[linear-gradient(135deg,#fff7ed_0%,#f5f3ff_45%,#eef2ff_100%)]">
                  <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow">
                    {item.categoryNameKo}
                  </div>
                </div>
                <div className="space-y-3 px-5 py-5">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-500">
                      {item.categoryNameKo}
                    </p>
                    <h3 className="text-xl font-black text-slate-950">{item.titleKo}</h3>
                    <p className="text-sm leading-6 text-slate-500">{item.description}</p>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>조회수 {formatCount(item.totalViews)}</span>
                    <span>리액션 {item.reactionCount}개</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
