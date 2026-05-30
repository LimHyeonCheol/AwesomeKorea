import type { ReactionVideo } from "@awesomekorea/shared";

import { formatCompactNumber, formatKoreanDate } from "../../lib/formatters";

const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

interface ReactionListItemProps {
  isExpanded: boolean;
  onToggle: () => void;
  reaction: ReactionVideo;
}

const getInlineEmbedUrl = (reaction: ReactionVideo) => {
  const separator = reaction.embedUrl.includes("?") ? "&" : "?";

  return `${reaction.embedUrl}${separator}playsinline=1&rel=0&modestbranding=1`;
};

export function ReactionListItem({ isExpanded, onToggle, reaction }: ReactionListItemProps) {
  const panelId = `reaction-panel-${reaction.id}`;
  const canRenderInlinePlayer = YOUTUBE_VIDEO_ID_PATTERN.test(reaction.youtubeVideoId);

  return (
    <article className={`reaction-card ${isExpanded ? "reaction-card--expanded" : ""}`}>
      <button
        className="reaction-card__trigger"
        type="button"
        aria-controls={panelId}
        aria-expanded={isExpanded}
        onClick={onToggle}
      >
        <span className="reaction-card__avatar">{reaction.channelName.slice(0, 1)}</span>
        <span className="reaction-card__body">
          <span className="reaction-card__title">{reaction.title}</span>
          <span className="reaction-card__channel">{reaction.channelName}</span>
        </span>
        <span className="reaction-card__meta">
          <span>조회수 {formatCompactNumber(reaction.viewCount)}</span>
          <span>{formatKoreanDate(reaction.publishedAt)}</span>
        </span>
        <span className="reaction-card__cta">{isExpanded ? "접기" : "영상 보기"}</span>
      </button>

      {isExpanded ? (
        <div className="reaction-card__expand" id={panelId}>
          <div className="reaction-card__player">
            {canRenderInlinePlayer ? (
              <iframe
                className="reaction-card__frame"
                src={getInlineEmbedUrl(reaction)}
                title={reaction.title}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="reaction-card__empty">
                현재 데이터에서는 인라인 재생 가능한 영상 ID가 없어 원본 링크로만 확인할 수 있습니다.
              </div>
            )}
          </div>

          <div className="reaction-card__summary">
            <div>
              <p className="reaction-card__summary-title">{reaction.title}</p>
              <p className="reaction-card__summary-channel">{reaction.channelName}</p>
            </div>
            <div className="reaction-card__summary-meta">
              <span>조회수 {formatCompactNumber(reaction.viewCount)}</span>
              <span>업로드 {formatKoreanDate(reaction.publishedAt)}</span>
              <a
                className="chip-button chip-button--solid"
                href={reaction.youtubeUrl}
                target="_blank"
                rel="noreferrer"
              >
                유튜브 원본 보기
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
