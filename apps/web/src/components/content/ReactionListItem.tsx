import type { ReactionVideo } from "@awesomekorea/shared";

import { formatCompactNumber, formatKoreanDate } from "../../lib/formatters";

interface ReactionListItemProps {
  isActive: boolean;
  onPlay: () => void;
  reaction: ReactionVideo;
}

export function ReactionListItem({ isActive, onPlay, reaction }: ReactionListItemProps) {
  return (
    <article className={`reaction-card ${isActive ? "reaction-card--active" : ""}`}>
      <div className="reaction-card__avatar">{reaction.channelName.slice(0, 1)}</div>
      <div className="reaction-card__body">
        <p className="reaction-card__title">{reaction.title}</p>
        <p className="reaction-card__channel">{reaction.channelName}</p>
      </div>
      <div className="reaction-card__meta">
        <span>조회수 {formatCompactNumber(reaction.viewCount)}</span>
        <span>{formatKoreanDate(reaction.publishedAt)}</span>
      </div>
      <div className="reaction-card__actions">
        <button className="chip-button chip-button--solid" type="button" onClick={onPlay}>
          {isActive ? "재생 중" : "재생"}
        </button>
        <a
          className="chip-button chip-button--ghost"
          href={reaction.youtubeUrl}
          target="_blank"
          rel="noreferrer"
        >
          원본
        </a>
      </div>
    </article>
  );
}
