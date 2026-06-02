import { useEffect, useState } from "react";

import type { SortOrder } from "@awesomekorea/shared";

import { AppFooter } from "../components/common/AppFooter";
import { AppHeader } from "../components/common/AppHeader";
import { SectionHeader } from "../components/common/SectionHeader";
import { StatusNotice } from "../components/common/StatusNotice";
import { ReactionListItem } from "../components/content/ReactionListItem";
import { useAsyncResource } from "../hooks/useAsyncResource";
import { apiClient } from "../lib/api-client";
import { formatCompactNumber, formatReleaseDateLabel } from "../lib/formatters";

interface ContentPageProps {
  contentSlug: string;
  onNavigateHome: (options?: { anchor?: string | null; sort?: SortOrder | null }) => void;
}

export function ContentPage({ contentSlug, onNavigateHome }: ContentPageProps) {
  const [selectedSort, setSelectedSort] = useState<SortOrder>("popular");
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  const detailResource = useAsyncResource(() => apiClient.getContentDetail(contentSlug), [contentSlug], {
    initialData: null,
  });

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
    if (!activeVideoId || !reactionResource.data) {
      return;
    }

    const hasActiveReaction = reactionResource.data.items.some(
      (reaction) => reaction.youtubeVideoId === activeVideoId,
    );

    if (!hasActiveReaction) {
      setActiveVideoId(null);
    }
  }, [activeVideoId, reactionResource.data]);

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
                description="선택한 콘텐츠의 메타데이터와 대표 리액션 목록을 정리하고 있습니다."
              />
            ) : null}

            {detailResource.error ? (
              <StatusNotice
                title="상세 정보를 불러오지 못했습니다."
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
                      "대표 리액션을 열면 아래 목록과 함께 빠르게 비교할 수 있습니다."
                    }
                  />
                </div>

                <div className="detail-panel__content">
                  <div className="detail-summary-card">
                    <div className="detail-summary-card__meta">
                      <span className="detail-badge">{detailResource.data.content.categoryNameKo}</span>
                      <span>
                        {formatReleaseDateLabel(
                          detailResource.data.content.releaseDate,
                          detailResource.data.content.releaseYear,
                        )}{" "}
                        · 리액션 {detailResource.data.content.reactionCount}개
                      </span>
                      <span>누적 조회수 {formatCompactNumber(detailResource.data.content.totalViews)}</span>
                    </div>

                    <p className="detail-summary-card__description">
                      {detailResource.data.content.heroMessageKo ??
                        detailResource.data.content.description ??
                        "해외 채널들이 어떤 포인트에 반응하는지 대표 리액션으로 먼저 살펴볼 수 있습니다."}
                    </p>
                    <p className="detail-summary-card__hint">
                      리스트에서 원하는 영상을 열면 같은 페이지 안에서 바로 비교할 수 있습니다.
                    </p>
                  </div>

                  <section className="detail-list-section">
                    <div className="detail-list-section__toolbar">
                      <SectionHeader
                        eyebrow="Reaction Feed"
                        title="관련 리액션"
                        description="인기순과 최신순을 오가며 대표 반응과 신규 반응을 함께 비교해보세요."
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
                        description="정렬 기준에 맞는 반응 영상을 다시 정리하고 있습니다."
                      />
                    ) : null}

                    {reactionResource.error ? (
                      <StatusNotice
                        title="리액션 목록을 불러오지 못했습니다."
                        description={reactionResource.error}
                        tone="danger"
                        actionLabel="다시 시도"
                        onAction={reactionResource.refetch}
                      />
                    ) : null}

                    {reactionResource.data && reactionResource.data.items.length === 0 ? (
                      <StatusNotice
                        title="표시할 리액션이 없습니다."
                        description="조건에 맞는 해외 리액션 영상이 아직 수집되지 않았습니다."
                      />
                    ) : null}

                    <div className="reaction-list">
                      {reactionResource.data?.items.map((reaction) => (
                        <ReactionListItem
                          key={reaction.youtubeVideoId}
                          isExpanded={reaction.youtubeVideoId === activeVideoId}
                          reaction={reaction}
                          onToggle={() =>
                            setActiveVideoId((currentVideoId) =>
                              currentVideoId === reaction.youtubeVideoId ? null : reaction.youtubeVideoId,
                            )
                          }
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

      <AppFooter
        updatedAt={
          detailResource.data?.content.latestReactionAt ?? reactionResource.data?.items[0]?.publishedAt ?? null
        }
      />
    </div>
  );
}
