import { useEffect, useState } from "react";

import type { SortOrder } from "@awesomekorea/shared";

import { AppFooter } from "../components/common/AppFooter";
import { AppHeader } from "../components/common/AppHeader";
import { SectionHeader } from "../components/common/SectionHeader";
import { StatusNotice } from "../components/common/StatusNotice";
import { ReactionListItem } from "../components/content/ReactionListItem";
import { useAsyncResource } from "../hooks/useAsyncResource";
import { apiClient } from "../lib/api-client";
import { formatCompactNumber, formatKoreanDate } from "../lib/formatters";

interface ContentPageProps {
  contentSlug: string;
  onNavigateHome: (options?: { anchor?: string | null; sort?: SortOrder | null }) => void;
}

const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function ContentPage({ contentSlug, onNavigateHome }: ContentPageProps) {
  const [selectedSort, setSelectedSort] = useState<SortOrder>("popular");
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  const detailResource = useAsyncResource(
    () => apiClient.getContentDetail(contentSlug),
    [contentSlug],
    {
      initialData: null,
    },
  );

  const reactionResource = useAsyncResource(
    () => apiClient.getReactions(contentSlug, selectedSort, 1, 12),
    [contentSlug, selectedSort],
    {
      initialData: null,
    },
  );

  useEffect(() => {
    setSelectedSort("popular");
    setActiveVideoId(null);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [contentSlug]);

  useEffect(() => {
    if (activeVideoId) {
      return;
    }

    const nextVideo =
      reactionResource.data?.featuredReaction ??
      reactionResource.data?.items[0] ??
      detailResource.data?.featuredReaction ??
      null;

    if (nextVideo) {
      setActiveVideoId(nextVideo.youtubeVideoId);
    }
  }, [activeVideoId, detailResource.data, reactionResource.data]);

  const activeReaction =
    reactionResource.data?.items.find((item) => item.youtubeVideoId === activeVideoId) ??
    reactionResource.data?.featuredReaction ??
    detailResource.data?.featuredReaction ??
    null;
  const canRenderInlinePlayer =
    activeReaction !== null && YOUTUBE_VIDEO_ID_PATTERN.test(activeReaction.youtubeVideoId);

  return (
    <div className="app-shell">
      <AppHeader
        onOpenRanking={() => onNavigateHome({ anchor: "ranking-section" })}
        onOpenCategories={() => onNavigateHome({ anchor: "category-section" })}
        onOpenLatest={() =>
          onNavigateHome({
            anchor: "category-section",
            sort: "latest",
          })
        }
      />

      <main className="site-main">
        <div className="page-stack">
          <section className="detail-page-shell">
            <button
              className="chip-button chip-button--ghost detail-page-shell__back"
              type="button"
              onClick={() => onNavigateHome()}
            >
              메인으로 돌아가기
            </button>

            {detailResource.isLoading && !detailResource.data ? (
              <StatusNotice
                title="상세 정보를 불러오는 중"
                description="선택한 콘텐츠의 메타 데이터와 대표 영상을 정리하고 있습니다."
              />
            ) : null}

            {detailResource.error ? (
              <StatusNotice
                title="상세 정보를 불러오지 못했습니다"
                description={detailResource.error}
                tone="danger"
                actionLabel="다시 시도"
                onAction={detailResource.refetch}
              />
            ) : null}

            {detailResource.data ? (
              <div className="detail-panel detail-panel--page">
                <div className="detail-panel__header detail-panel__header--page">
                  <SectionHeader
                    eyebrow="Content Detail"
                    title={detailResource.data.content.titleKo}
                    description={
                      detailResource.data.content.description ??
                      "선택한 콘텐츠의 대표 리액션과 최신 반응 영상을 한 페이지에서 확인합니다."
                    }
                  />
                </div>

                <div className="detail-panel__content">
                  <div className="detail-hero-card">
                    <div className="detail-hero-card__meta">
                      <span className="detail-badge">{detailResource.data.content.categoryNameKo}</span>
                      <span>
                        {detailResource.data.content.releaseYear ?? "미정"} · 리액션{" "}
                        {detailResource.data.content.reactionCount}개
                      </span>
                      <span>
                        누적 조회수 {formatCompactNumber(detailResource.data.content.totalViews)}
                      </span>
                    </div>

                    <div className="detail-player">
                      {activeReaction && canRenderInlinePlayer ? (
                        <iframe
                          className="detail-player__frame"
                          src={activeReaction.embedUrl}
                          title={activeReaction.title}
                          loading="lazy"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <div className="detail-player__empty">
                          {activeReaction
                            ? "현재 선택한 영상은 인라인 재생을 지원하지 않아 원본 링크로 열어야 합니다."
                            : "아직 재생할 리액션 영상이 없습니다."}
                        </div>
                      )}
                    </div>

                    {activeReaction ? (
                      <div className="detail-player__summary">
                        <div>
                          <p className="detail-player__title">{activeReaction.title}</p>
                          <p className="detail-player__channel">{activeReaction.channelName}</p>
                        </div>
                        <div className="detail-player__stats">
                          <span>조회수 {formatCompactNumber(activeReaction.viewCount)}</span>
                          <span>{formatKoreanDate(activeReaction.publishedAt)}</span>
                          <a
                            className="chip-button chip-button--solid"
                            href={activeReaction.youtubeUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            유튜브 원본 보기
                          </a>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <section className="detail-list-section">
                    <div className="detail-list-section__toolbar">
                      <SectionHeader
                        eyebrow="Reaction Feed"
                        title="관련 리액션"
                        description="정렬만 바꿔가며 같은 상세 화면 안에서 동적으로 다시 불러옵니다."
                      />
                      <div className="sort-toggle" role="tablist" aria-label="리액션 정렬">
                        <button
                          className={`sort-toggle__button ${
                            selectedSort === "popular" ? "sort-toggle__button--active" : ""
                          }`}
                          type="button"
                          onClick={() => setSelectedSort("popular")}
                        >
                          인기순
                        </button>
                        <button
                          className={`sort-toggle__button ${
                            selectedSort === "latest" ? "sort-toggle__button--active" : ""
                          }`}
                          type="button"
                          onClick={() => setSelectedSort("latest")}
                        >
                          최신순
                        </button>
                      </div>
                    </div>

                    {reactionResource.isLoading && !reactionResource.data ? (
                      <StatusNotice
                        title="리액션 목록을 불러오는 중"
                        description="정렬 조건에 맞는 반응 영상을 다시 정리하고 있습니다."
                      />
                    ) : null}

                    {reactionResource.error ? (
                      <StatusNotice
                        title="리액션 목록을 불러오지 못했습니다"
                        description={reactionResource.error}
                        tone="danger"
                        actionLabel="다시 시도"
                        onAction={reactionResource.refetch}
                      />
                    ) : null}

                    <div className="reaction-list">
                      {reactionResource.data?.items.map((reaction) => (
                        <ReactionListItem
                          key={reaction.youtubeVideoId}
                          isActive={reaction.youtubeVideoId === activeReaction?.youtubeVideoId}
                          reaction={reaction}
                          onPlay={() => setActiveVideoId(reaction.youtubeVideoId)}
                        />
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </main>

      <AppFooter updatedAt={detailResource.data?.content.latestReactionAt ?? null} />
    </div>
  );
}
