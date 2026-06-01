import type { CategorySlug } from "../constants/categories";

export type SortOrder = "popular" | "latest";
export type CategoryFilter = CategorySlug | "all";
export type ContentStatus = "active" | "hidden";

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
  description: string | null;
  thumbnailUrl: string | null;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  youtubeUrl: string;
  embedUrl: string;
  channelName: string;
}

export interface ReactionCommentReply {
  id: string;
  authorDisplayName: string;
  authorProfileImageUrl: string | null;
  text: string;
  likeCount: number;
  publishedAt: string;
}

export interface ReactionComment {
  id: string;
  authorDisplayName: string;
  authorProfileImageUrl: string | null;
  text: string;
  likeCount: number;
  publishedAt: string;
  updatedAt: string;
  replyCount: number;
  replies: ReactionCommentReply[];
}

export interface ReactionCommentsPayload {
  videoId: string;
  status: "ok" | "empty" | "disabled" | "unavailable";
  items: ReactionComment[];
  order: "relevance" | "time";
  strategy: "top50" | "full";
  fetchedAll: boolean;
  pageSize: number;
  fetchedCount: number;
  totalCommentCount: number;
  estimatedQuotaUnits: number;
  message: string;
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

export interface HomeSiteCopy {
  brandName: string;
  brandTagline: string;
  heroBadge: string;
  heroToolbarCopy: string;
  heroTitle: string;
  heroDescription: string;
}

export interface HomeFeaturedReaction {
  sortOrder: number;
  contentSlug: string;
  contentTitle: string;
  categorySlug: CategorySlug;
  categoryNameKo: string;
  reactionCount: number;
  totalViews: number;
  reaction: ReactionVideo;
}

export interface HomePayload {
  siteCopy: HomeSiteCopy;
  hero: HeroHighlight | null;
  featuredReactions: HomeFeaturedReaction[];
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

export interface AdminContent {
  id: number;
  categoryId: number;
  categorySlug: string;
  categoryNameKo: string;
  slug: string;
  titleKo: string;
  titleEn: string | null;
  aliases: string[];
  releaseYear: number | null;
  thumbnailUrl: string | null;
  description: string | null;
  status: ContentStatus;
  reactionCount: number;
  totalViews: number;
  latestReactionAt: string | null;
}

export interface AdminReactionVideo {
  id: number;
  youtubeVideoId: string;
  contentId: number;
  contentSlug: string;
  contentTitleKo: string;
  categorySlug: string;
  categoryNameKo: string;
  channelName: string;
  originalTitle: string;
  adminTitle: string | null;
  adminDescription: string | null;
  displayTitle: string;
  thumbnailUrl: string | null;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  youtubeUrl: string;
  isFeatured: boolean;
  featuredOrder: number;
}

export interface AdminDashboardPayload {
  settings: HomeSiteCopy;
  categories: Category[];
  contents: AdminContent[];
  featuredReactions: AdminReactionVideo[];
  reactions: AdminReactionVideo[];
}
