import type { ContentSummary } from "@awesomekorea/shared";

import { formatCompactNumber, formatReleaseDateLabel } from "../../lib/formatters";

interface ContentCardProps {
  content: ContentSummary;
  onOpen: (slug: string) => void;
}

export function ContentCard({ content, onOpen }: ContentCardProps) {
  return (
    <article className="content-card">
      <button className="content-card__visual" type="button" onClick={() => onOpen(content.slug)}>
        {content.isEditorialPick ? (
          <span className="content-card__editorial-badge">운영 우선</span>
        ) : null}
        <span className="content-card__pill">리액션 {content.reactionCount}</span>
        <span className="content-card__category">{content.categoryNameKo}</span>
      </button>
      <div className="content-card__body">
        <div className="content-card__eyebrow-row">
          <p className="content-card__eyebrow">{content.categoryNameKo}</p>
          <span className="content-card__release">
            {formatReleaseDateLabel(content.releaseDate, content.releaseYear)}
          </span>
        </div>
        <h3 className="content-card__title">{content.titleKo}</h3>
        <p className="content-card__description">
          {content.heroMessageKo ??
            content.description ??
            "대표 리액션과 최신 반응을 빠르게 훑어볼 수 있는 콘텐츠입니다."}
        </p>
        <div className="content-card__meta">
          <span>조회수 {formatCompactNumber(content.totalViews)}</span>
          <span>영상 {content.reactionCount}개</span>
          <span>우선순위 {content.priorityScore}</span>
        </div>
      </div>
    </article>
  );
}
