import type {
  Category,
  ContentDetail,
  ContentSummary,
  HomePayload,
  HomeRankingItem,
  PaginatedResponse,
  ReactionVideo,
  SortOrder,
} from "@awesomekorea/shared";

import { CATEGORY_NAME_BY_SLUG, type CategorySlug } from "@awesomekorea/shared";

import { toPaginatedResponse } from "../lib/pagination";
import {
  parseJsonArray,
  toBoolean,
  toNullableString,
  toNumber,
  toStringValue,
} from "../lib/serializers";

interface CategoryRow {
  id: number;
  isActive: number;
  nameKo: string;
  slug: CategorySlug;
  sortOrder: number;
}

interface ContentSummaryRow {
  categoryNameKo: string;
  categorySlug: CategorySlug;
  description: string | null;
  id: number;
  latestReactionAt: string | null;
  reactionCount: number;
  releaseYear: number | null;
  slug: string;
  thumbnailUrl: string | null;
  titleEn: string | null;
  titleKo: string;
  totalViews: number;
}

interface ContentDetailRow extends ContentSummaryRow {
  aliasesJson: string | null;
}

interface RankingRow {
  categoryNameKo: string;
  categorySlug: CategorySlug;
  contentSlug: string;
  rank: number;
  reactionCount: number;
  thumbnailUrl: string | null;
  titleKo: string;
  totalViews: number;
}

interface ReactionVideoRow {
  channelId?: string | null;
  channelName: string;
  commentCount: number;
  id: number;
  likeCount: number;
  publishedAt: string;
  thumbnailUrl: string | null;
  title: string;
  viewCount: number;
  youtubeUrl: string;
  youtubeVideoId: string;
}

interface StoredReactionTitleRow {
  title: string;
  youtubeVideoId: string;
}

export interface SyncContent {
  aliases: string[];
  categoryNameKo: string;
  id: number;
  slug: string;
  titleEn: string | null;
  titleKo: string;
}

export interface UpsertChannelInput {
  countryCode?: string | null;
  defaultLanguage?: string | null;
  isKoreanChannel?: boolean;
  title: string;
  youtubeChannelId: string;
}

export interface UpsertReactionVideoInput {
  channelId: number;
  commentCount: number;
  contentId: number;
  detectedLanguage?: string | null;
  isOverseasReaction: boolean;
  likeCount: number;
  publishedAt: string;
  thumbnailUrl?: string | null;
  title: string;
  viewCount: number;
  youtubeUrl: string;
  youtubeVideoId: string;
}

const VALID_YOUTUBE_VIDEO_ID_LENGTH = 11;

const buildYoutubeWatchUrl = (youtubeVideoId: string) =>
  `https://www.youtube.com/watch?v=${youtubeVideoId}`;

const buildYoutubeEmbedUrl = (youtubeVideoId: string) =>
  `https://www.youtube-nocookie.com/embed/${youtubeVideoId}?playsinline=1&rel=0&modestbranding=1`;

const mapCategory = (row: CategoryRow): Category => ({
  id: toNumber(row.id),
  slug: row.slug,
  nameKo: toStringValue(row.nameKo),
  sortOrder: toNumber(row.sortOrder),
  isActive: toBoolean(row.isActive),
});

const mapContentSummary = (row: ContentSummaryRow): ContentSummary => ({
  id: toNumber(row.id),
  slug: toStringValue(row.slug),
  titleKo: toStringValue(row.titleKo),
  titleEn: toNullableString(row.titleEn),
  categorySlug: row.categorySlug,
  categoryNameKo:
    toNullableString(row.categoryNameKo) ?? CATEGORY_NAME_BY_SLUG[row.categorySlug],
  releaseYear: row.releaseYear === null ? null : toNumber(row.releaseYear),
  thumbnailUrl: toNullableString(row.thumbnailUrl),
  description: toNullableString(row.description),
  reactionCount: toNumber(row.reactionCount),
  totalViews: toNumber(row.totalViews),
  latestReactionAt: toNullableString(row.latestReactionAt),
});

const mapRankingItem = (row: RankingRow): HomeRankingItem => ({
  rank: toNumber(row.rank),
  contentSlug: toStringValue(row.contentSlug),
  titleKo: toStringValue(row.titleKo),
  categorySlug: row.categorySlug,
  categoryNameKo:
    toNullableString(row.categoryNameKo) ?? CATEGORY_NAME_BY_SLUG[row.categorySlug],
  reactionCount: toNumber(row.reactionCount),
  totalViews: toNumber(row.totalViews),
  thumbnailUrl: toNullableString(row.thumbnailUrl),
});

const mapReactionVideo = (row: ReactionVideoRow): ReactionVideo => ({
  id: toNumber(row.id),
  youtubeVideoId: toStringValue(row.youtubeVideoId),
  title: toStringValue(row.title),
  thumbnailUrl: toNullableString(row.thumbnailUrl),
  publishedAt: toStringValue(row.publishedAt),
  viewCount: toNumber(row.viewCount),
  likeCount: toNumber(row.likeCount),
  commentCount: toNumber(row.commentCount),
  youtubeUrl: buildYoutubeWatchUrl(toStringValue(row.youtubeVideoId)),
  embedUrl: buildYoutubeEmbedUrl(toStringValue(row.youtubeVideoId)),
  channelName: toStringValue(row.channelName),
});

export const getCategories = async (db: D1Database): Promise<Category[]> => {
  const result = await db
    .prepare(
      `
        SELECT
          id,
          slug,
          name_ko AS nameKo,
          sort_order AS sortOrder,
          is_active AS isActive
        FROM categories
        WHERE is_active = 1
        ORDER BY sort_order ASC, id ASC
      `,
    )
    .all<CategoryRow>();

  return (result.results ?? []).map(mapCategory);
};

export const getHomePayload = async (db: D1Database): Promise<HomePayload> => {
  const topResult = await db
    .prepare(
      `
        WITH latest_window AS (
          SELECT COALESCE(date(MAX(rv.published_at)), date('now')) AS snapshotDate
          FROM reaction_videos rv
          WHERE rv.is_overseas_reaction = 1
            AND LENGTH(rv.youtube_video_id) = ${VALID_YOUTUBE_VIDEO_ID_LENGTH}
        ),
        aggregated AS (
          SELECT
            c.id AS contentId,
            cat.id AS categoryId,
            c.slug AS contentSlug,
            c.title_ko AS titleKo,
            cat.slug AS categorySlug,
            cat.name_ko AS categoryNameKo,
            COUNT(rv.id) AS reactionCount,
            COALESCE(SUM(rv.view_count), 0) AS totalViews,
            c.thumbnail_url AS thumbnailUrl
          FROM contents c
          JOIN categories cat
            ON cat.id = c.category_id
          JOIN reaction_videos rv
            ON rv.content_id = c.id
          CROSS JOIN latest_window lw
          WHERE c.status = 'active'
            AND rv.is_overseas_reaction = 1
            AND LENGTH(rv.youtube_video_id) = ${VALID_YOUTUBE_VIDEO_ID_LENGTH}
            AND date(rv.published_at) BETWEEN date(lw.snapshotDate, '-6 day') AND date(lw.snapshotDate)
          GROUP BY
            c.id,
            cat.id,
            c.slug,
            c.title_ko,
            cat.slug,
            cat.name_ko,
            c.thumbnail_url
        ),
        ranked AS (
          SELECT
            contentId,
            categoryId,
            contentSlug,
            titleKo,
            categorySlug,
            categoryNameKo,
            reactionCount,
            totalViews,
            thumbnailUrl,
            ROW_NUMBER() OVER (
              ORDER BY reactionCount DESC, totalViews DESC, contentId ASC
            ) AS rank
          FROM aggregated
        )
        SELECT
          rank,
          contentSlug,
          titleKo,
          categorySlug,
          categoryNameKo,
          reactionCount,
          totalViews,
          thumbnailUrl
        FROM ranked
        ORDER BY rank ASC
        LIMIT 10
      `,
    )
    .all<RankingRow>();

  const popularResult = await db
    .prepare(
      `
        SELECT
          c.id AS id,
          c.slug AS slug,
          c.title_ko AS titleKo,
          c.title_en AS titleEn,
          cat.slug AS categorySlug,
          cat.name_ko AS categoryNameKo,
          c.release_year AS releaseYear,
          c.thumbnail_url AS thumbnailUrl,
          c.description AS description,
          COUNT(rv.id) AS reactionCount,
          COALESCE(SUM(rv.view_count), 0) AS totalViews,
          MAX(rv.published_at) AS latestReactionAt
        FROM contents c
        JOIN categories cat
          ON cat.id = c.category_id
        LEFT JOIN reaction_videos rv
          ON rv.content_id = c.id
          AND rv.is_overseas_reaction = 1
          AND LENGTH(rv.youtube_video_id) = ${VALID_YOUTUBE_VIDEO_ID_LENGTH}
        WHERE c.status = 'active'
        GROUP BY
          c.id,
          c.slug,
          c.title_ko,
          c.title_en,
          cat.slug,
          cat.name_ko,
          c.release_year,
          c.thumbnail_url,
          c.description
        ORDER BY totalViews DESC, reactionCount DESC, latestReactionAt DESC, titleKo ASC
      `,
    )
    .all<ContentSummaryRow>();

  const top10 = (topResult.results ?? []).map(mapRankingItem);
  const popularItems = (popularResult.results ?? []).map(mapContentSummary);
  const sections: HomePayload["popularByCategory"] = [
    {
      categorySlug: "all" as const,
      categoryNameKo: "전체",
      items: popularItems.slice(0, 8),
    },
  ];

  for (const [slug, nameKo] of Object.entries(CATEGORY_NAME_BY_SLUG) as [
    CategorySlug,
    string,
  ][]) {
    sections.push({
      categorySlug: slug,
      categoryNameKo: nameKo,
      items: popularItems.filter((item) => item.categorySlug === slug).slice(0, 4),
    });
  }

  return {
    hero: top10[0]
      ? {
          contentSlug: top10[0].contentSlug,
          titleKo: top10[0].titleKo,
          categoryNameKo: top10[0].categoryNameKo,
          reactionCount: top10[0].reactionCount,
          message: "오늘 가장 많이 본 반응 콘텐츠",
        }
      : null,
    top10,
    popularByCategory: sections,
    updatedAt: new Date().toISOString(),
  };
};

export const getContentList = async (
  db: D1Database,
  options: {
    category?: string;
    limit: number;
    page: number;
    sort: SortOrder;
  },
): Promise<PaginatedResponse<ContentSummary>> => {
  const filters = ["c.status = 'active'"];
  const countFilters = ["c.status = 'active'"];
  const bindings: unknown[] = [];
  const countBindings: unknown[] = [];

  if (options.category) {
    filters.push("cat.slug = ?");
    countFilters.push("cat.slug = ?");
    bindings.push(options.category);
    countBindings.push(options.category);
  }

  const orderBy =
    options.sort === "latest"
      ? "CASE WHEN latestReactionAt IS NULL THEN 1 ELSE 0 END ASC, latestReactionAt DESC, totalViews DESC, titleKo ASC"
      : "totalViews DESC, reactionCount DESC, latestReactionAt DESC, titleKo ASC";

  const result = await db
    .prepare(
      `
        SELECT
          c.id AS id,
          c.slug AS slug,
          c.title_ko AS titleKo,
          c.title_en AS titleEn,
          cat.slug AS categorySlug,
          cat.name_ko AS categoryNameKo,
          c.release_year AS releaseYear,
          c.thumbnail_url AS thumbnailUrl,
          c.description AS description,
          COUNT(rv.id) AS reactionCount,
          COALESCE(SUM(rv.view_count), 0) AS totalViews,
          MAX(rv.published_at) AS latestReactionAt
        FROM contents c
        JOIN categories cat
          ON cat.id = c.category_id
        LEFT JOIN reaction_videos rv
          ON rv.content_id = c.id
          AND rv.is_overseas_reaction = 1
          AND LENGTH(rv.youtube_video_id) = ${VALID_YOUTUBE_VIDEO_ID_LENGTH}
        WHERE ${filters.join(" AND ")}
        GROUP BY
          c.id,
          c.slug,
          c.title_ko,
          c.title_en,
          cat.slug,
          cat.name_ko,
          c.release_year,
          c.thumbnail_url,
          c.description
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?
      `,
    )
    .bind(...bindings, options.limit, (options.page - 1) * options.limit)
    .all<ContentSummaryRow>();

  const totalRow = await db
    .prepare(
      `
        SELECT COUNT(*) AS total
        FROM contents c
        JOIN categories cat
          ON cat.id = c.category_id
        WHERE ${countFilters.join(" AND ")}
      `,
    )
    .bind(...countBindings)
    .first<{ total: number }>();

  return toPaginatedResponse(
    (result.results ?? []).map(mapContentSummary),
    options.page,
    options.limit,
    toNumber(totalRow?.total),
  );
};

export const getContentBySlug = async (
  db: D1Database,
  slug: string,
): Promise<ContentDetail | null> => {
  const row = await db
    .prepare(
      `
        SELECT
          c.id AS id,
          c.slug AS slug,
          c.title_ko AS titleKo,
          c.title_en AS titleEn,
          cat.slug AS categorySlug,
          cat.name_ko AS categoryNameKo,
          c.release_year AS releaseYear,
          c.thumbnail_url AS thumbnailUrl,
          c.description AS description,
          COUNT(rv.id) AS reactionCount,
          COALESCE(SUM(rv.view_count), 0) AS totalViews,
          MAX(rv.published_at) AS latestReactionAt,
          c.aliases_json AS aliasesJson
        FROM contents c
        JOIN categories cat
          ON cat.id = c.category_id
        LEFT JOIN reaction_videos rv
          ON rv.content_id = c.id
          AND rv.is_overseas_reaction = 1
          AND LENGTH(rv.youtube_video_id) = ${VALID_YOUTUBE_VIDEO_ID_LENGTH}
        WHERE c.slug = ?
          AND c.status = 'active'
        GROUP BY
          c.id,
          c.slug,
          c.title_ko,
          c.title_en,
          cat.slug,
          cat.name_ko,
          c.release_year,
          c.thumbnail_url,
          c.description,
          c.aliases_json
      `,
    )
    .bind(slug)
    .first<ContentDetailRow>();

  if (!row) {
    return null;
  }

  return {
    ...mapContentSummary(row),
    aliases: parseJsonArray(row.aliasesJson),
  };
};

export const getFeaturedReactionByContentSlug = async (
  db: D1Database,
  slug: string,
): Promise<ReactionVideo | null> => {
  const row = await db
    .prepare(
      `
        SELECT
          rv.id AS id,
          rv.youtube_video_id AS youtubeVideoId,
          rv.title AS title,
          rv.thumbnail_url AS thumbnailUrl,
          rv.published_at AS publishedAt,
          rv.view_count AS viewCount,
          rv.like_count AS likeCount,
          rv.comment_count AS commentCount,
          rv.youtube_url AS youtubeUrl,
          ch.title AS channelName
        FROM reaction_videos rv
        JOIN contents c
          ON c.id = rv.content_id
        JOIN channels ch
          ON ch.id = rv.channel_id
        WHERE c.slug = ?
          AND rv.is_overseas_reaction = 1
          AND LENGTH(rv.youtube_video_id) = ${VALID_YOUTUBE_VIDEO_ID_LENGTH}
        ORDER BY rv.view_count DESC, rv.published_at DESC
        LIMIT 1
      `,
    )
    .bind(slug)
    .first<ReactionVideoRow>();

  return row ? mapReactionVideo(row) : null;
};

export const getReactionsByContentSlug = async (
  db: D1Database,
  options: {
    limit: number;
    page: number;
    slug: string;
    sort: SortOrder;
  },
): Promise<PaginatedResponse<ReactionVideo>> => {
  const orderBy =
    options.sort === "latest"
      ? "rv.published_at DESC, rv.view_count DESC"
      : "rv.view_count DESC, rv.published_at DESC";

  const result = await db
    .prepare(
      `
        SELECT
          rv.id AS id,
          rv.youtube_video_id AS youtubeVideoId,
          rv.title AS title,
          rv.thumbnail_url AS thumbnailUrl,
          rv.published_at AS publishedAt,
          rv.view_count AS viewCount,
          rv.like_count AS likeCount,
          rv.comment_count AS commentCount,
          rv.youtube_url AS youtubeUrl,
          ch.title AS channelName
        FROM reaction_videos rv
        JOIN contents c
          ON c.id = rv.content_id
        JOIN channels ch
          ON ch.id = rv.channel_id
        WHERE c.slug = ?
          AND rv.is_overseas_reaction = 1
          AND LENGTH(rv.youtube_video_id) = ${VALID_YOUTUBE_VIDEO_ID_LENGTH}
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?
      `,
    )
    .bind(options.slug, options.limit, (options.page - 1) * options.limit)
    .all<ReactionVideoRow>();

  const totalRow = await db
    .prepare(
      `
        SELECT COUNT(*) AS total
        FROM reaction_videos rv
        JOIN contents c
          ON c.id = rv.content_id
        WHERE c.slug = ?
          AND rv.is_overseas_reaction = 1
          AND LENGTH(rv.youtube_video_id) = ${VALID_YOUTUBE_VIDEO_ID_LENGTH}
      `,
    )
    .bind(options.slug)
    .first<{ total: number }>();

  return toPaginatedResponse(
    (result.results ?? []).map(mapReactionVideo),
    options.page,
    options.limit,
    toNumber(totalRow?.total),
  );
};

export const getActiveContentsForSync = async (db: D1Database): Promise<SyncContent[]> => {
  const result = await db
    .prepare(
      `
        SELECT
          c.id AS id,
          c.slug AS slug,
          c.title_ko AS titleKo,
          c.title_en AS titleEn,
          c.aliases_json AS aliasesJson,
          cat.name_ko AS categoryNameKo
        FROM contents c
        JOIN categories cat
          ON cat.id = c.category_id
        WHERE c.status = 'active'
        ORDER BY cat.sort_order ASC, c.id ASC
      `,
    )
    .all<{
      aliasesJson: string | null;
      categoryNameKo: string;
      id: number;
      slug: string;
      titleEn: string | null;
      titleKo: string;
    }>();

  return (result.results ?? []).map((row) => ({
    id: toNumber(row.id),
    slug: toStringValue(row.slug),
    titleKo: toStringValue(row.titleKo),
    titleEn: toNullableString(row.titleEn),
    categoryNameKo: toStringValue(row.categoryNameKo),
    aliases: parseJsonArray(row.aliasesJson),
  }));
};

export const countValidReactionVideos = async (db: D1Database): Promise<number> => {
  const row = await db
    .prepare(
      `
        SELECT COUNT(*) AS total
        FROM reaction_videos
        WHERE is_overseas_reaction = 1
          AND LENGTH(youtube_video_id) = ${VALID_YOUTUBE_VIDEO_ID_LENGTH}
      `,
    )
    .first<{ total: number }>();

  return toNumber(row?.total);
};

export const getStoredReactionVideosForContent = async (
  db: D1Database,
  contentId: number,
): Promise<Array<{ title: string; youtubeVideoId: string }>> => {
  const result = await db
    .prepare(
      `
        SELECT
          title,
          youtube_video_id AS youtubeVideoId
        FROM reaction_videos
        WHERE content_id = ?
          AND is_overseas_reaction = 1
          AND LENGTH(youtube_video_id) = ${VALID_YOUTUBE_VIDEO_ID_LENGTH}
      `,
    )
    .bind(contentId)
    .all<StoredReactionTitleRow>();

  return (result.results ?? []).map((row) => ({
    title: toStringValue(row.title),
    youtubeVideoId: toStringValue(row.youtubeVideoId),
  }));
};

export const setReactionVideoOverseasFlag = async (
  db: D1Database,
  youtubeVideoId: string,
  isOverseasReaction: boolean,
) => {
  await db
    .prepare(
      `
        UPDATE reaction_videos
        SET
          is_overseas_reaction = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE youtube_video_id = ?
      `,
    )
    .bind(isOverseasReaction ? 1 : 0, youtubeVideoId)
    .run();
};

export const upsertChannel = async (
  db: D1Database,
  input: UpsertChannelInput,
): Promise<number> => {
  await db
    .prepare(
      `
        INSERT INTO channels (
          youtube_channel_id,
          title,
          country_code,
          default_language,
          is_korean_channel
        )
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(youtube_channel_id) DO UPDATE SET
          title = excluded.title,
          country_code = COALESCE(excluded.country_code, channels.country_code),
          default_language = COALESCE(excluded.default_language, channels.default_language),
          is_korean_channel = excluded.is_korean_channel
      `,
    )
    .bind(
      input.youtubeChannelId,
      input.title,
      input.countryCode ?? null,
      input.defaultLanguage ?? null,
      input.isKoreanChannel ? 1 : 0,
    )
    .run();

  const row = await db
    .prepare(
      `
        SELECT id
        FROM channels
        WHERE youtube_channel_id = ?
      `,
    )
    .bind(input.youtubeChannelId)
    .first<{ id: number }>();

  return toNumber(row?.id);
};

export const upsertReactionVideo = async (
  db: D1Database,
  input: UpsertReactionVideoInput,
): Promise<void> => {
  await db
    .prepare(
      `
        INSERT INTO reaction_videos (
          youtube_video_id,
          content_id,
          channel_id,
          title,
          thumbnail_url,
          published_at,
          view_count,
          like_count,
          comment_count,
          detected_language,
          is_overseas_reaction,
          youtube_url,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(youtube_video_id) DO UPDATE SET
          content_id = excluded.content_id,
          channel_id = excluded.channel_id,
          title = excluded.title,
          thumbnail_url = excluded.thumbnail_url,
          published_at = excluded.published_at,
          view_count = excluded.view_count,
          like_count = excluded.like_count,
          comment_count = excluded.comment_count,
          detected_language = excluded.detected_language,
          is_overseas_reaction = excluded.is_overseas_reaction,
          youtube_url = excluded.youtube_url,
          updated_at = CURRENT_TIMESTAMP
      `,
    )
    .bind(
      input.youtubeVideoId,
      input.contentId,
      input.channelId,
      input.title,
      input.thumbnailUrl ?? null,
      input.publishedAt,
      input.viewCount,
      input.likeCount,
      input.commentCount,
      input.detectedLanguage ?? null,
      input.isOverseasReaction ? 1 : 0,
      input.youtubeUrl,
    )
    .run();
};
