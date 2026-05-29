import type { ContentSummary } from "@awesomekorea/shared";

import { ContentCard } from "./ContentCard";

interface ContentGridSectionProps {
  items: ContentSummary[];
  onOpenContent: (slug: string) => void;
}

export function ContentGridSection({ items, onOpenContent }: ContentGridSectionProps) {
  return (
    <div className="content-grid">
      {items.map((item) => (
        <ContentCard key={item.slug} content={item} onOpen={onOpenContent} />
      ))}
    </div>
  );
}
