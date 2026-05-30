import { useEffect, useEffectEvent, useState } from "react";

import type { HeroHighlight, ReactionVideo } from "@awesomekorea/shared";

import { formatCompactNumber } from "../../lib/formatters";

const AUTO_ADVANCE_MS = 7000;
const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export interface HeroBannerSlide {
  categoryNameKo: string;
  contentSlug: string;
  contentTitle: string;
  message: string;
  overview: string;
  primaryReaction: ReactionVideo;
  reactionCount: number;
  relatedReactions: ReactionVideo[];
  tags: string[];
  totalViews: number;
}

interface HeroBannerProps {
  hero: HeroHighlight | null;
  isLoading: boolean;
  onLatestClick: () => void;
  onOpenContent: (slug: string) => void;
  slides: HeroBannerSlide[];
}

const isEmbeddableReaction = (reaction: ReactionVideo) =>
  YOUTUBE_VIDEO_ID_PATTERN.test(reaction.youtubeVideoId);

const getAutoplayEmbedUrl = (reaction: ReactionVideo) => {
  const separator = reaction.embedUrl.includes("?") ? "&" : "?";

  return `${reaction.embedUrl}${separator}autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1`;
};

const getReactionThumbnailUrl = (reaction: ReactionVideo) => {
  if (reaction.thumbnailUrl) {
    return reaction.thumbnailUrl;
  }

  if (!isEmbeddableReaction(reaction)) {
    return null;
  }

  return `https://i.ytimg.com/vi/${reaction.youtubeVideoId}/hqdefault.jpg`;
};

export function HeroBanner({
  hero,
  isLoading,
  onLatestClick,
  onOpenContent,
  slides,
}: HeroBannerProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const moveSlide = useEffectEvent((direction: 1 | -1 = 1) => {
    if (slides.length < 2) {
      return;
    }

    setActiveIndex((currentIndex) => {
      const nextIndex = currentIndex + direction;

      if (nextIndex < 0) {
        return slides.length - 1;
      }

      return nextIndex % slides.length;
    });
  });

  useEffect(() => {
    setActiveIndex(0);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length < 2) {
      return;
    }

    const timer = window.setInterval(() => {
      moveSlide(1);
    }, AUTO_ADVANCE_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [moveSlide, slides.length]);

  const activeSlide = slides[activeIndex] ?? null;

  if (!activeSlide) {
    return (
      <section className="hero-banner">
        <div className="hero-banner__fallback">
          <div className="hero-banner__copy">
            <span className="hero-banner__live-badge">추천 리액션</span>
            <h1 className="hero-banner__title">
              관심 있는 한국 콘텐츠의 대표 반응을 메인에서 바로 훑어볼 수 있게 준비하고 있습니다.
            </h1>
            <p className="hero-banner__description">
              상단 대표 섹션에서는 자동으로 넘어가는 추천 리액션과 함께, 바로 상세 페이지로
              이어지는 탐색 흐름을 제공합니다.
            </p>
            <div className="hero-banner__actions">
              <button
                className="chip-button chip-button--solid"
                type="button"
                onClick={() => hero && onOpenContent(hero.contentSlug)}
                disabled={!hero}
              >
                대표 콘텐츠 보기
              </button>
              <button className="chip-button chip-button--ghost" type="button" onClick={onLatestClick}>
                최신 반응 보기
              </button>
            </div>
          </div>

          <div className="hero-banner__highlight">
            <p className="hero-banner__highlight-title">대표 반응 준비 상태</p>
            {hero ? (
              <>
                <p className="hero-banner__highlight-name">{hero.titleKo}</p>
                <p className="hero-banner__highlight-meta">
                  {hero.categoryNameKo} · 리액션 {hero.reactionCount}개
                </p>
                <p className="hero-banner__highlight-copy">{hero.message}</p>
              </>
            ) : (
              <p className="hero-banner__highlight-copy">
                {isLoading
                  ? "대표 리액션 영상을 정리하는 중입니다."
                  : "표시할 대표 리액션 데이터가 아직 없습니다."}
              </p>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="hero-banner">
      <div className="hero-banner__toolbar">
        <div>
          <span className="hero-banner__live-badge">추천 리액션</span>
          <p className="hero-banner__toolbar-copy">
            대표 반응 영상을 자동으로 넘겨보며 지금 많이 보는 리액션을 빠르게 훑어보세요.
          </p>
        </div>

        {slides.length > 1 ? (
          <div className="hero-banner__controls">
            <button
              className="hero-banner__nav-button"
              type="button"
              aria-label="이전 대표 반응"
              onClick={() => moveSlide(-1)}
            >
              ‹
            </button>
            <button
              className="hero-banner__nav-button"
              type="button"
              aria-label="다음 대표 반응"
              onClick={() => moveSlide(1)}
            >
              ›
            </button>
          </div>
        ) : null}
      </div>

      <div className="hero-banner__stage">
        <div className="hero-banner__media">
          {isEmbeddableReaction(activeSlide.primaryReaction) ? (
            <iframe
              key={activeSlide.primaryReaction.youtubeVideoId}
              className="hero-banner__frame"
              src={getAutoplayEmbedUrl(activeSlide.primaryReaction)}
              title={activeSlide.primaryReaction.title}
              loading="eager"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="hero-banner__placeholder">
              <div className="hero-banner__placeholder-inner">
                <p className="hero-banner__placeholder-title">{activeSlide.contentTitle}</p>
                <p className="hero-banner__placeholder-copy">
                  현재 데이터에서는 인라인 재생 가능한 영상 ID가 없어 추천 반응 설명만 먼저
                  보여드립니다.
                </p>
              </div>
            </div>
          )}

          <div className="hero-banner__media-caption">
            <span>{String(activeIndex + 1).padStart(2, "0")}</span>
            <span>{activeSlide.contentTitle}</span>
          </div>
        </div>

        <div className="hero-banner__panel">
          <p className="hero-banner__eyebrow">
            {activeSlide.categoryNameKo} · {activeSlide.contentTitle}
          </p>
          <h1 className="hero-banner__title">{activeSlide.primaryReaction.title}</h1>
          <p className="hero-banner__description">{activeSlide.overview}</p>
          <p className="hero-banner__message">{activeSlide.message}</p>

          <div className="hero-banner__stats">
            <span className="hero-banner__meta-badge">
              채널 {activeSlide.primaryReaction.channelName}
            </span>
            <span className="hero-banner__meta-badge">
              조회수 {formatCompactNumber(activeSlide.primaryReaction.viewCount)}
            </span>
            <span className="hero-banner__meta-badge">
              누적 {formatCompactNumber(activeSlide.totalViews)}
            </span>
            <span className="hero-banner__meta-badge">리액션 {activeSlide.reactionCount}개</span>
          </div>

          <div className="hero-banner__tags">
            {activeSlide.tags.map((tag) => (
              <span key={`${activeSlide.contentSlug}-${tag}`} className="hero-banner__tag">
                #{tag}
              </span>
            ))}
          </div>

          <div className="hero-banner__thumb-grid" aria-hidden="true">
            {activeSlide.relatedReactions.slice(0, 4).map((reaction) => {
              const thumbnailUrl = getReactionThumbnailUrl(reaction);

              return (
                <div key={reaction.youtubeVideoId} className="hero-banner__thumb">
                  {thumbnailUrl ? (
                    <img src={thumbnailUrl} alt="" loading="lazy" />
                  ) : (
                    <div className="hero-banner__thumb-fallback">{reaction.title}</div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="hero-banner__actions">
            <button
              className="chip-button chip-button--solid"
              type="button"
              onClick={() => onOpenContent(activeSlide.contentSlug)}
            >
              관련 리액션 전체 보기
            </button>
            <button className="chip-button chip-button--ghost" type="button" onClick={onLatestClick}>
              최신 반응 보기
            </button>
          </div>
        </div>
      </div>

      {slides.length > 1 ? (
        <div className="hero-banner__pagination" aria-label="대표 반응 선택">
          {slides.map((slide, index) => (
            <button
              key={slide.contentSlug}
              className={`hero-banner__dot ${index === activeIndex ? "hero-banner__dot--active" : ""}`}
              type="button"
              aria-label={`${slide.contentTitle} 대표 반응 보기`}
              onClick={() => setActiveIndex(index)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
