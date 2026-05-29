import type { ContentSummary } from "@awesomekorea/shared";

import { formatCompactNumber } from "../../lib/formatters";

interface ContentCardProps {
  content: ContentSummary;
  onOpen: (slug: string) => void;
}

export function ContentCard({ content, onOpen }: ContentCardProps) {
  return (
    <article className="content-card">
      <button className="content-card__visual" type="button" onClick={() => onOpen(content.slug)}>
        <span className="content-card__pill">리액션 {content.reactionCount}</span>
        <span className="content-card__category">{content.categoryNameKo}</span>
      </button>
      <div className="content-card__body">
        <p className="content-card__eyebrow">{content.categoryNameKo}</p>
        <h3 className="content-card__title">{content.titleKo}</h3>
        <p className="content-card__description">
          {content.description ?? "대표 리액션과 최신 반응을 빠르게 훑어볼 수 있는 콘텐츠입니다."}
        </p>
        <div className="content-card__meta">
          <span>조회수 {formatCompactNumber(content.totalViews)}</span>
          <span>영상 {content.reactionCount}개</span>
        </div>
      </div>
    </article>
  );
}
