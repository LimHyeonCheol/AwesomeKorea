import { useEffect, useEffectEvent, useState } from "react";

import type { SortOrder } from "@awesomekorea/shared";

import { useAsyncResource } from "../../hooks/useAsyncResource";
import { apiClient } from "../../lib/api-client";
import { formatCompactNumber, formatKoreanDate } from "../../lib/formatters";
import { SectionHeader } from "../common/SectionHeader";
import { StatusNotice } from "../common/StatusNotice";
import { ReactionListItem } from "./ReactionListItem";

interface ContentDetailOverlayProps {
  contentSlug: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function ContentDetailOverlay({
  contentSlug,
  isOpen,
  onClose,
}: ContentDetailOverlayProps) {
  const [selectedSort, setSelectedSort] = useState<SortOrder>("popular");
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  const detailResource = useAsyncResource(
    () => apiClient.getContentDetail(contentSlug ?? ""),
    [contentSlug],
    {
      enabled: isOpen && Boolean(contentSlug),
      initialData: null,
    },
  );

  const reactionResource = useAsyncResource(
    () => apiClient.getReactions(contentSlug ?? "", selectedSort, 1, 12),
    [contentSlug, selectedSort],
    {
      enabled: isOpen && Boolean(contentSlug),
      initialData: null,
    },
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSelectedSort("popular");
    setActiveVideoId(null);
  }, [contentSlug, isOpen]);

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

  const handleEscape = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Escape") {
      onClose();
    }
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const listener = (event: KeyboardEvent) => handleEscape(event);
    window.addEventListener("keydown", listener);

    return () => {
      window.removeEventListener("keydown", listener);
    };
  }, [handleEscape, isOpen]);

  if (!isOpen || !contentSlug) {
    return null;
  }

  const activeReaction =
    reactionResource.data?.items.find((item) => item.youtubeVideoId === activeVideoId) ??
    reactionResource.data?.featuredReaction ??
    detailResource.data?.featuredReaction ??
    null;
  const canRenderInlinePlayer =
    activeReaction !== null && YOUTUBE_VIDEO_ID_PATTERN.test(activeReaction.youtubeVideoId);

  return (
    <div className="detail-overlay" role="presentation" onClick={onClose}>
      <aside
        className="detail-panel"
        role="dialog"
        aria-modal="true"
        aria-label="콘텐츠 상세"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="detail-panel__header">
          <SectionHeader
            eyebrow="Content Detail"
            title={detailResource.data?.content.titleKo ?? "상세 불러오는 중"}
            description={
              detailResource.data?.content.description ??
              "선택한 콘텐츠의 대표 리액션과 관련 영상을 한 자리에서 확인합니다."
            }
          />
          <button className="detail-panel__close" type="button" onClick={onClose}>
            닫기
          </button>
        </div>

        {detailResource.isLoading && !detailResource.data ? (
          <StatusNotice
            title="상세 정보를 불러오는 중"
            description="선택한 콘텐츠의 메타데이터와 대표 영상을 가져오고 있습니다."
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
          <div className="detail-panel__content">
            <div className="detail-hero-card">
              <div className="detail-hero-card__meta">
                <span className="detail-badge">{detailResource.data.content.categoryNameKo}</span>
                <span>
                  {detailResource.data.content.releaseYear ?? "미정"} · 리액션{" "}
                  {detailResource.data.content.reactionCount}개
                </span>
                <span>합산 조회수 {formatCompactNumber(detailResource.data.content.totalViews)}</span>
              </div>
              <div className="detail-player">
                {activeReaction && canRenderInlinePlayer ? (
                  <iframe
                    className="detail-player__frame"
                    src={activeReaction.embedUrl}
                    title={activeReaction.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="detail-player__empty">
                    {activeReaction
                      ? "현재 연결된 데모 영상은 인라인 재생을 지원하지 않습니다."
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
                    {canRenderInlinePlayer ? (
                      <a
                        className="chip-button chip-button--solid"
                        href={activeReaction.youtubeUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        유튜브 보기
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <section className="detail-list-section">
              <div className="detail-list-section__toolbar">
                <SectionHeader
                  eyebrow="Inline Player"
                  title="관련 리액션"
                  description="상세 화면은 하나의 오버레이 컴포넌트로 재사용되며 정렬만 바뀝니다."
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
        ) : null}
      </aside>
    </div>
  );
}
