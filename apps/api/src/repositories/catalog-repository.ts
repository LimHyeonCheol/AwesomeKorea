import type {
  Category,
  ContentDetail,
  ContentSummary,
  HomePayload,
  HomeRankingItem,
  PaginatedResponse,
  ReactionVideo,
  SortOrder,
  TranslationSource,
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
import { getFeaturedHomeReactions, getHomeSiteCopy } from "./site-settings-repository";

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
  heroMessageKo: string | null;
  id: number;
  isEditorialPick: number;
  latestReactionAt: string | null;
  priorityScore: number;
  releaseDate: string | null;
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
  searchKeywordsJson: string | null;
}

interface EditorialContentRow extends ContentSummaryRow {
  body: string | null;
  headline: string | null;
  slotCode: string;
  sortOrder: number;
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
  displayDescription: string | null;
  displayTitle: string;
  descriptionSource: string | null;
  id: number;
  likeCount: number;
  originalDescription: string | null;
  originalTitle: string;
  publishedAt: string;
  thumbnailUrl: string | null;
  titleSource: string | null;
  viewCount: number;
  youtubeUrl: string;
  youtubeVideoId: string;
}

interface StoredReactionTitleRow {
  title: string;
  youtubeVideoId: string;
}

interface ReactionTranslationContextRow {
  categoryNameKo: string;
  channelName: string;
  commentCount: number;
  contentTitleEn: string | null;
  contentTitleKo: string;
  description: string | null;
  detectedLanguage: string | null;
  title: string;
  youtubeVideoId: string;
}

export interface SyncContent {
  aliases: string[];
  categoryNameKo: string;
  categorySlug: CategorySlug;
  id: number;
  priorityScore: number;
  searchKeywords: string[];
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
  description?: string | null;
  isOverseasReaction: boolean;
  likeCount: number;
  localizedDescription?: string | null;
  localizedDescriptionSource?: "machine" | "youtube_localized" | null;
  localizedTitle?: string | null;
  localizedTitleSource?: "machine" | "youtube_localized" | null;
  publishedAt: string;
  thumbnailUrl?: string | null;
  title: string;
  viewCount: number;
  youtubeUrl: string;
  youtubeVideoId: string;
}

export interface ReactionTranslationContext {
  categoryNameKo: string;
  channelName: string;
  commentCount: number;
  contentTitleEn: string | null;
  contentTitleKo: string;
  description: string | null;
  detectedLanguage: string | null;
  title: string;
  youtubeVideoId: string;
}

const VALID_YOUTUBE_VIDEO_ID_LENGTH = 11;

const buildYoutubeWatchUrl = (youtubeVideoId: string) =>
  `https://www.youtube.com/watch?v=${youtubeVideoId}`;

const buildYoutubeEmbedUrl = (youtubeVideoId: string) =>
  `https://www.youtube-nocookie.com/embed/${youtubeVideoId}?playsinline=1&rel=0&modestbranding=1`;

const toTranslationSource = (
  value: unknown,
  fallback: TranslationSource,
): TranslationSource => {
  if (
    value === "manual" ||
    value === "youtube_localized" ||
    value === "machine" ||
    value === "original"
  ) {
    return value;
  }

  return fallback;
};

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
    toNullableString(row.categoryNameKo) ?? CATEGORY_NAME_BY_SLUG[row.categorySlug] ?? row.categorySlug,
  releaseYear: row.releaseYear === null ? null : toNumber(row.releaseYear),
  releaseDate: toNullableString(row.releaseDate),
  thumbnailUrl: toNullableString(row.thumbnailUrl),
  description: toNullableString(row.description),
  heroMessageKo: toNullableString(row.heroMessageKo),
  priorityScore: toNumber(row.priorityScore),
  isEditorialPick: toBoolean(row.isEditorialPick),
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
    toNullableString(row.categoryNameKo) ?? CATEGORY_NAME_BY_SLUG[row.categorySlug] ?? row.categorySlug,
  reactionCount: toNumber(row.reactionCount),
  totalViews: toNumber(row.totalViews),
  thumbnailUrl: toNullableString(row.thumbnailUrl),
});

const mapReactionVideo = (row: ReactionVideoRow): ReactionVideo => ({
  id: toNumber(row.id),
  youtubeVideoId: toStringValue(row.youtubeVideoId),
  title: toStringValue(row.displayTitle),
  titleOriginal: toStringValue(row.originalTitle),
  titleTranslationSource: toTranslationSource(row.titleSource, "original"),
  hasTitleTranslation: toStringValue(row.displayTitle) !== toStringValue(row.originalTitle),
  description: toNullableString(row.displayDescription),
  descriptionOriginal: toNullableString(row.originalDescription),
  descriptionTranslationSource: toNullableString(row.displayDescription)
    ? toTranslationSource(row.descriptionSource, "original")
    : null,
  hasDescriptionTranslation:
    toNullableString(row.displayDescription) !== null &&
    toNullableString(row.displayDescription) !== toNullableString(row.originalDescription),
  thumbnailUrl: toNullableString(row.thumbnailUrl),
  publishedAt: toStringValue(row.publishedAt),
  viewCount: toNumber(row.viewCount),
  likeCount: toNumber(row.likeCount),
  commentCount: toNumber(row.commentCount),
  youtubeUrl: buildYoutubeWatchUrl(toStringValue(row.youtubeVideoId)),
  embedUrl: buildYoutubeEmbedUrl(toStringValue(row.youtubeVideoId)),
  channelName: toStringValue(row.channelName),
});

const buildEditorialPickExpression = (contentAlias: string) => `
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM editorial_entries ee
      JOIN editorial_slots es
        ON es.id = ee.slot_id
      WHERE ee.target_type = 'content'
        AND ee.target_ref = ${contentAlias}.slug
        AND ee.is_active = 1
        AND es.is_active = 1
    ) THEN 1
    ELSE 0
  END
`;

const getEditorialContentEntries = async (
  db: D1Database,
  slotCode: string,
): Promise<
  Array<{
    body: string | null;
    content: ContentSummary;
    headline: string;
    slotCode: string;
    sortOrder: number;
  }>
> => {
  const result = await db
    .prepare(
      `
        SELECT
          es.slot_code AS slotCode,
          ee.sort_order AS sortOrder,
          ee.headline_override_ko AS headline,
          ee.body_override_ko AS body,
          c.id AS id,
          c.slug AS slug,
          c.title_ko AS titleKo,
          c.title_en AS titleEn,
          cat.slug AS categorySlug,
          cat.name_ko AS categoryNameKo,
          c.release_year AS releaseYear,
          c.release_date AS releaseDate,
          c.thumbnail_url AS thumbnailUrl,
          c.description AS description,
          c.hero_message_ko AS heroMessageKo,
          c.priority_score AS priorityScore,
          1 AS isEditorialPick,
          COUNT(rv.id) AS reactionCount,
          COALESCE(SUM(rv.view_count), 0) AS totalViews,
          MAX(rv.published_at) AS latestReactionAt
        FROM editorial_slots es
        JOIN editorial_entries ee
          ON ee.slot_id = es.id
        JOIN contents c
          ON c.slug = ee.target_ref
        JOIN categories cat
          ON cat.id = c.category_id
        LEFT JOIN reaction_videos rv
          ON rv.content_id = c.id
          AND rv.is_overseas_reaction = 1
          AND LENGTH(rv.youtube_video_id) = ${VALID_YOUTUBE_VIDEO_ID_LENGTH}
        WHERE es.slot_code = ?
          AND es.is_active = 1
          AND ee.is_active = 1
          AND c.status = 'active'
          AND cat.is_active = 1
        GROUP BY
          es.slot_code,
          ee.sort_order,
          ee.headline_override_ko,
          ee.body_override_ko,
          c.id,
          c.slug,
          c.title_ko,
          c.title_en,
          cat.slug,
          cat.name_ko,
          c.release_year,
          c.release_date,
          c.thumbnail_url,
          c.description,
          c.hero_message_ko,
          c.priority_score
        ORDER BY ee.sort_order ASC, c.priority_score DESC, totalViews DESC, c.id ASC
      `,
    )
    .bind(slotCode)
    .all<EditorialContentRow>();

  return (result.results ?? []).map((row) => ({
    slotCode: toStringValue(row.slotCode),
    sortOrder: toNumber(row.sortOrder),
    headline: toNullableString(row.headline) ?? toStringValue(row.titleKo),
    body: toNullableString(row.body),
    content: mapContentSummary(row),
  }));
};

const getEditorialHeroSlug = async (
  db: D1Database,
  slotCode: string,
): Promise<string | null> => {
  const row = await db
    .prepare(
      `
        SELECT ee.target_ref AS slug
        FROM editorial_slots es
        JOIN editorial_entries ee
          ON ee.slot_id = es.id
        JOIN contents c
          ON c.slug = ee.target_ref
        JOIN categories cat
          ON cat.id = c.category_id
        WHERE es.slot_code = ?
          AND es.is_active = 1
          AND ee.is_active = 1
          AND c.status = 'active'
          AND cat.is_active = 1
        ORDER BY ee.sort_order ASC, ee.id ASC
        LIMIT 1
      `,
    )
    .bind(slotCode)
    .first<{ slug: string }>();

  return toNullableString(row?.slug);
};

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
  const [
    siteCopy,
    featuredReactions,
    categories,
    homeHeroEntries,
    featuredContentEntries,
    topResult,
    popularResult,
  ] = await Promise.all([
    getHomeSiteCopy(db),
    getFeaturedHomeReactions(db),
    getCategories(db),
    getEditorialContentEntries(db, "home.hero"),
    getEditorialContentEntries(db, "home.featured.contents"),
    db
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
      .all<RankingRow>(),
    db
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
            c.release_date AS releaseDate,
            c.thumbnail_url AS thumbnailUrl,
            c.description AS description,
            c.hero_message_ko AS heroMessageKo,
            c.priority_score AS priorityScore,
            ${buildEditorialPickExpression("c")} AS isEditorialPick,
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
            AND cat.is_active = 1
          GROUP BY
            c.id,
            c.slug,
            c.title_ko,
            c.title_en,
            cat.slug,
            cat.name_ko,
            c.release_year,
            c.release_date,
            c.thumbnail_url,
            c.description,
            c.hero_message_ko,
            c.priority_score
          ORDER BY c.priority_score DESC, totalViews DESC, reactionCount DESC, latestReactionAt DESC, titleKo ASC
        `,
      )
      .all<ContentSummaryRow>(),
  ]);

  const top10 = (topResult.results ?? []).map(mapRankingItem);
  const popularItems = (popularResult.results ?? []).map(mapContentSummary);
  const contentBySlug = new Map(popularItems.map((item) => [item.slug, item]));
  const sections: HomePayload["popularByCategory"] = [
    {
      categorySlug: "all",
      categoryNameKo: "?꾩껜",
      items: popularItems.slice(0, 8),
    },
  ];

  for (const category of categories) {
    sections.push({
      categorySlug: category.slug,
      categoryNameKo: category.nameKo,
      items: popularItems.filter((item) => item.categorySlug === category.slug).slice(0, 4),
    });
  }

  const heroEntry = homeHeroEntries[0] ?? null;
  const fallbackHeroContent =
    (featuredReactions[0] ? contentBySlug.get(featuredReactions[0].contentSlug) : null) ??
    (top10[0] ? contentBySlug.get(top10[0].contentSlug) : null) ??
    null;
  const hero = heroEntry
    ? {
        contentSlug: heroEntry.content.slug,
        titleKo: heroEntry.content.titleKo,
        categoryNameKo: heroEntry.content.categoryNameKo,
        reactionCount: heroEntry.content.reactionCount,
        message:
          heroEntry.content.heroMessageKo ??
          heroEntry.body ??
          heroEntry.headline ??
          siteCopy.heroDescription,
        releaseDate: heroEntry.content.releaseDate,
      }
    : featuredReactions[0]
      ? {
          contentSlug: featuredReactions[0].contentSlug,
          titleKo: featuredReactions[0].contentTitle,
          categoryNameKo: featuredReactions[0].categoryNameKo,
          reactionCount: featuredReactions[0].reactionCount,
          message: fallbackHeroContent?.heroMessageKo ?? "관리자가 고른 대표 반응",
          releaseDate: fallbackHeroContent?.releaseDate ?? null,
        }
      : top10[0]
        ? {
            contentSlug: top10[0].contentSlug,
            titleKo: top10[0].titleKo,
            categoryNameKo: top10[0].categoryNameKo,
            reactionCount: top10[0].reactionCount,
            message: fallbackHeroContent?.heroMessageKo ?? "지금 가장 많이 보는 반응 콘텐츠",
            releaseDate: fallbackHeroContent?.releaseDate ?? null,
          }
        : null;

  return {
    siteCopy,
    hero,
    featuredContents: featuredContentEntries.map((entry) => ({
      slotCode: entry.slotCode,
      headline: entry.headline,
      body: entry.body ?? entry.content.heroMessageKo,
      content: entry.content,
    })),
    featuredReactions,
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
  const filters = ["c.status = 'active'", "cat.is_active = 1"];
  const countFilters = ["c.status = 'active'", "cat.is_active = 1"];
  const bindings: unknown[] = [];
  const countBindings: unknown[] = [];

  if (options.category) {
    filters.push("cat.slug = ?");
    countFilters.push("cat.slug = ?");
    bindings.push(options.category);
    countBindings.push(options.category);
  }

  const categoryHeroSlug = options.category
    ? await getEditorialHeroSlug(db, `category.${options.category}.hero`)
    : null;
  const orderBindings = categoryHeroSlug ? [categoryHeroSlug] : [];
  const priorityOrderPrefix = categoryHeroSlug
    ? "CASE WHEN c.slug = ? THEN 0 ELSE 1 END ASC, "
    : "";
  const orderBy =
    options.sort === "latest"
      ? `${priorityOrderPrefix}c.priority_score DESC, CASE WHEN latestReactionAt IS NULL THEN 1 ELSE 0 END ASC, latestReactionAt DESC, totalViews DESC, titleKo ASC`
      : `${priorityOrderPrefix}c.priority_score DESC, totalViews DESC, reactionCount DESC, latestReactionAt DESC, titleKo ASC`;

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
          c.release_date AS releaseDate,
          c.thumbnail_url AS thumbnailUrl,
          c.description AS description,
          c.hero_message_ko AS heroMessageKo,
          c.priority_score AS priorityScore,
          ${buildEditorialPickExpression("c")} AS isEditorialPick,
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
          c.release_date,
          c.thumbnail_url,
          c.description,
          c.hero_message_ko,
          c.priority_score
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?
      `,
    )
    .bind(...bindings, ...orderBindings, options.limit, (options.page - 1) * options.limit)
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
          c.release_date AS releaseDate,
          c.thumbnail_url AS thumbnailUrl,
          c.description AS description,
          c.hero_message_ko AS heroMessageKo,
          c.priority_score AS priorityScore,
          ${buildEditorialPickExpression("c")} AS isEditorialPick,
          COUNT(rv.id) AS reactionCount,
          COALESCE(SUM(rv.view_count), 0) AS totalViews,
          MAX(rv.published_at) AS latestReactionAt,
          c.aliases_json AS aliasesJson,
          c.search_keywords_json AS searchKeywordsJson
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
          c.release_date,
          c.thumbnail_url,
          c.description,
          c.hero_message_ko,
          c.priority_score,
          c.aliases_json,
          c.search_keywords_json
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
    searchKeywords: parseJsonArray(row.searchKeywordsJson),
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
          COALESCE(rv.admin_title, rv.localized_title, rv.title) AS displayTitle,
          CASE
            WHEN rv.admin_title IS NOT NULL AND TRIM(rv.admin_title) <> '' THEN 'manual'
            WHEN rv.localized_title IS NOT NULL AND TRIM(rv.localized_title) <> '' THEN rv.localized_title_source
            ELSE 'original'
          END AS titleSource,
          rv.title AS originalTitle,
          COALESCE(rv.admin_description, rv.localized_description, rv.description) AS displayDescription,
          CASE
            WHEN rv.admin_description IS NOT NULL AND TRIM(rv.admin_description) <> '' THEN 'manual'
            WHEN rv.localized_description IS NOT NULL AND TRIM(rv.localized_description) <> '' THEN rv.localized_description_source
            WHEN rv.description IS NOT NULL AND TRIM(rv.description) <> '' THEN 'original'
            ELSE NULL
          END AS descriptionSource,
          rv.description AS originalDescription,
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
        ORDER BY rv.is_featured_home DESC, rv.featured_home_order ASC, rv.view_count DESC, rv.published_at DESC
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
          COALESCE(rv.admin_title, rv.localized_title, rv.title) AS displayTitle,
          CASE
            WHEN rv.admin_title IS NOT NULL AND TRIM(rv.admin_title) <> '' THEN 'manual'
            WHEN rv.localized_title IS NOT NULL AND TRIM(rv.localized_title) <> '' THEN rv.localized_title_source
            ELSE 'original'
          END AS titleSource,
          rv.title AS originalTitle,
          COALESCE(rv.admin_description, rv.localized_description, rv.description) AS displayDescription,
          CASE
            WHEN rv.admin_description IS NOT NULL AND TRIM(rv.admin_description) <> '' THEN 'manual'
            WHEN rv.localized_description IS NOT NULL AND TRIM(rv.localized_description) <> '' THEN rv.localized_description_source
            WHEN rv.description IS NOT NULL AND TRIM(rv.description) <> '' THEN 'original'
            ELSE NULL
          END AS descriptionSource,
          rv.description AS originalDescription,
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

export const getReactionByYoutubeVideoId = async (
  db: D1Database,
  youtubeVideoId: string,
): Promise<ReactionVideo | null> => {
  const row = await db
    .prepare(
      `
        SELECT
          rv.id AS id,
          rv.youtube_video_id AS youtubeVideoId,
          COALESCE(rv.admin_title, rv.localized_title, rv.title) AS displayTitle,
          CASE
            WHEN rv.admin_title IS NOT NULL AND TRIM(rv.admin_title) <> '' THEN 'manual'
            WHEN rv.localized_title IS NOT NULL AND TRIM(rv.localized_title) <> '' THEN rv.localized_title_source
            ELSE 'original'
          END AS titleSource,
          rv.title AS originalTitle,
          COALESCE(rv.admin_description, rv.localized_description, rv.description) AS displayDescription,
          CASE
            WHEN rv.admin_description IS NOT NULL AND TRIM(rv.admin_description) <> '' THEN 'manual'
            WHEN rv.localized_description IS NOT NULL AND TRIM(rv.localized_description) <> '' THEN rv.localized_description_source
            WHEN rv.description IS NOT NULL AND TRIM(rv.description) <> '' THEN 'original'
            ELSE NULL
          END AS descriptionSource,
          rv.description AS originalDescription,
          rv.thumbnail_url AS thumbnailUrl,
          rv.published_at AS publishedAt,
          rv.view_count AS viewCount,
          rv.like_count AS likeCount,
          rv.comment_count AS commentCount,
          rv.youtube_url AS youtubeUrl,
          ch.title AS channelName
        FROM reaction_videos rv
        JOIN channels ch
          ON ch.id = rv.channel_id
        WHERE rv.youtube_video_id = ?
          AND rv.is_overseas_reaction = 1
          AND LENGTH(rv.youtube_video_id) = ${VALID_YOUTUBE_VIDEO_ID_LENGTH}
        LIMIT 1
      `,
    )
    .bind(youtubeVideoId)
    .first<ReactionVideoRow>();

  return row ? mapReactionVideo(row) : null;
};

export const getReactionTranslationContextByYoutubeVideoId = async (
  db: D1Database,
  youtubeVideoId: string,
): Promise<ReactionTranslationContext | null> => {
  const row = await db
    .prepare(
      `
        SELECT
          rv.youtube_video_id AS youtubeVideoId,
          rv.title AS title,
          rv.description AS description,
          rv.comment_count AS commentCount,
          rv.detected_language AS detectedLanguage,
          ch.title AS channelName,
          c.title_ko AS contentTitleKo,
          c.title_en AS contentTitleEn,
          cat.name_ko AS categoryNameKo
        FROM reaction_videos rv
        JOIN channels ch
          ON ch.id = rv.channel_id
        JOIN contents c
          ON c.id = rv.content_id
        JOIN categories cat
          ON cat.id = c.category_id
        WHERE rv.youtube_video_id = ?
          AND rv.is_overseas_reaction = 1
          AND LENGTH(rv.youtube_video_id) = ${VALID_YOUTUBE_VIDEO_ID_LENGTH}
        LIMIT 1
      `,
    )
    .bind(youtubeVideoId)
    .first<ReactionTranslationContextRow>();

  if (!row) {
    return null;
  }

  return {
    youtubeVideoId: toStringValue(row.youtubeVideoId),
    title: toStringValue(row.title),
    description: toNullableString(row.description),
    commentCount: toNumber(row.commentCount),
    detectedLanguage: toNullableString(row.detectedLanguage),
    channelName: toStringValue(row.channelName),
    contentTitleKo: toStringValue(row.contentTitleKo),
    contentTitleEn: toNullableString(row.contentTitleEn),
    categoryNameKo: toStringValue(row.categoryNameKo),
  };
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
          c.search_keywords_json AS searchKeywordsJson,
          c.priority_score AS priorityScore,
          cat.slug AS categorySlug,
          cat.name_ko AS categoryNameKo
        FROM contents c
        JOIN categories cat
          ON cat.id = c.category_id
        WHERE c.status = 'active'
          AND cat.is_active = 1
        ORDER BY c.priority_score DESC, cat.sort_order ASC, c.id ASC
      `,
    )
    .all<{
      aliasesJson: string | null;
      categoryNameKo: string;
      categorySlug: CategorySlug;
      id: number;
      priorityScore: number;
      searchKeywordsJson: string | null;
      slug: string;
      titleEn: string | null;
      titleKo: string;
    }>();

  return (result.results ?? []).map((row) => ({
    id: toNumber(row.id),
    slug: toStringValue(row.slug),
    titleKo: toStringValue(row.titleKo),
    titleEn: toNullableString(row.titleEn),
    categorySlug: row.categorySlug,
    categoryNameKo: toStringValue(row.categoryNameKo),
    aliases: parseJsonArray(row.aliasesJson),
    searchKeywords: parseJsonArray(row.searchKeywordsJson),
    priorityScore: toNumber(row.priorityScore),
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
          description,
          localized_title,
          localized_title_source,
          localized_description,
          localized_description_source,
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(youtube_video_id) DO UPDATE SET
          content_id = excluded.content_id,
          channel_id = excluded.channel_id,
          title = excluded.title,
          description = excluded.description,
          localized_title = CASE
            WHEN reaction_videos.title <> excluded.title THEN excluded.localized_title
            ELSE COALESCE(excluded.localized_title, reaction_videos.localized_title)
          END,
          localized_title_source = CASE
            WHEN reaction_videos.title <> excluded.title THEN excluded.localized_title_source
            ELSE COALESCE(excluded.localized_title_source, reaction_videos.localized_title_source)
          END,
          localized_description = CASE
            WHEN COALESCE(reaction_videos.description, '') <> COALESCE(excluded.description, '')
              THEN excluded.localized_description
            ELSE COALESCE(excluded.localized_description, reaction_videos.localized_description)
          END,
          localized_description_source = CASE
            WHEN COALESCE(reaction_videos.description, '') <> COALESCE(excluded.description, '')
              THEN excluded.localized_description_source
            ELSE COALESCE(
              excluded.localized_description_source,
              reaction_videos.localized_description_source
            )
          END,
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
      input.description ?? null,
      input.localizedTitle ?? null,
      input.localizedTitleSource ?? null,
      input.localizedDescription ?? null,
      input.localizedDescriptionSource ?? null,
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
