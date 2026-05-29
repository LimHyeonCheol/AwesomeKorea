import type { CategorySlug } from "../constants/categories";

export type SortOrder = "popular" | "latest";
export type CategoryFilter = CategorySlug | "all";

export interface Category {
  id: number;
  slug: CategorySlug;
  nameKo: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ContentSummary {
  id: number;
  slug: string;
  titleKo: string;
  titleEn: string | null;
  categorySlug: CategorySlug;
  categoryNameKo: string;
  releaseYear: number | null;
  thumbnailUrl: string | null;
  description: string | null;
  reactionCount: number;
  totalViews: number;
  latestReactionAt: string | null;
}

export interface ContentDetail extends ContentSummary {
  aliases: string[];
}

export interface ReactionVideo {
  id: number;
  youtubeVideoId: string;
  title: string;
  thumbnailUrl: string | null;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  youtubeUrl: string;
  embedUrl: string;
  channelName: string;
}

export interface HomeRankingItem {
  rank: number;
  contentSlug: string;
  titleKo: string;
  categorySlug: CategorySlug;
  categoryNameKo: string;
  reactionCount: number;
  totalViews: number;
  thumbnailUrl: string | null;
}

export interface HeroHighlight {
  contentSlug: string;
  titleKo: string;
  categoryNameKo: string;
  reactionCount: number;
  message: string;
}

export interface HomeSection {
  categorySlug: CategorySlug | "all";
  categoryNameKo: string;
  items: ContentSummary[];
}

export interface HomePayload {
  hero: HeroHighlight | null;
  top10: HomeRankingItem[];
  popularByCategory: HomeSection[];
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ContentDetailPayload {
  content: ContentDetail;
  featuredReaction: ReactionVideo | null;
  availableSorts: SortOrder[];
}

export interface ReactionListPayload extends PaginatedResponse<ReactionVideo> {
  content: {
    slug: string;
    titleKo: string;
    categoryNameKo: string;
  };
  featuredReaction: ReactionVideo | null;
  sort: SortOrder;
}

export interface InternalJobResult {
  success: boolean;
  processedCount: number;
  updatedCount: number;
  skippedCount: number;
  summary: string;
  errors: string[];
  snapshotDate?: string;
}
