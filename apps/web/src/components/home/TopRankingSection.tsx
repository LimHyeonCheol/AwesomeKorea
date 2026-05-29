import type { HomeRankingItem } from "@awesomekorea/shared";

import { formatCompactNumber } from "../../lib/formatters";
import { SectionHeader } from "../common/SectionHeader";

interface TopRankingSectionProps {
  items: HomeRankingItem[];
  onOpenContent: (slug: string) => void;
  updatedAt: string | null;
}

const formatUpdatedAt = (value: string | null) => {
  if (!value) {
    return "집계 중";
  }

  return new Date(value).toLocaleString("ko-KR");
};

export function TopRankingSection({
  items,
  onOpenContent,
  updatedAt,
}: TopRankingSectionProps) {
  return (
    <section className="panel-section" id="ranking-section">
      <div className="panel-section__header">
        <SectionHeader
          eyebrow="Weekly Ranking"
          title="이번 주 TOP 10"
          description="최근 7일 기준 반응 수와 조회수 집계로 정렬한 주간 랭킹입니다."
        />
        <p className="panel-section__meta">마지막 갱신 {formatUpdatedAt(updatedAt)}</p>
      </div>

      <div className="ranking-grid">
        {items.map((item) => (
          <button
            key={`${item.rank}-${item.contentSlug}`}
            className="ranking-card"
            type="button"
            onClick={() => onOpenContent(item.contentSlug)}
          >
            <span className="ranking-card__rank">{String(item.rank).padStart(2, "0")}</span>
            <span className="ranking-card__body">
              <span className="ranking-card__title">{item.titleKo}</span>
              <span className="ranking-card__meta">
                {item.categoryNameKo} · 리액션 {item.reactionCount}개
              </span>
            </span>
            <span className="ranking-card__views">{formatCompactNumber(item.totalViews)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
