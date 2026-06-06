import type {
  AdminContent,
  AdminContentDetail,
  AdminDashboardPayload,
  AdminReactionVideo,
  Category,
  ContentStatus,
  HomeSiteCopy,
  TranslationSource,
} from "@awesomekorea/shared";

import { parseJsonArray, toBoolean, toNullableString, toNumber, toStringValue } from "../lib/serializers";
import {
  getFeaturedHomeReactions,
  getHomeSiteCopy,
  upsertHomeSiteCopy,
} from "./site-settings-repository";

interface AdminCategoryRow {
  id: number;
  isActive: number;
  nameKo: string;
  slug: string;
  sortOrder: number;
}

interface AdminContentSummaryRow {
  categoryId: number;
  categoryNameKo: string;
  categorySlug: string;
  id: number;
  latestReactionAt: string | null;
  reactionCount: number;
  releaseDate: string | null;
  releaseYear: number | null;
  slug: string;
  status: ContentStatus;
  titleEn: string | null;
  titleKo: string;
  totalViews: number;
}

interface AdminContentDetailRow extends AdminContentSummaryRow {
  aliasesJson: string | null;
  description: string | null;
  heroMessageKo: string | null;
  priorityScore: number;
  searchKeywordsJson: string | null;
  thumbnailUrl: string | null;
}

interface AdminReactionRow {
  adminDescription: string | null;
  adminTitle: string | null;
  categoryNameKo: string;
  categorySlug: string;
  channelName: string;
  commentCount: number;
  contentId: number;
  contentSlug: string;
  contentTitleKo: string;
  displayTitle: string;
  featuredOrder: number;
  id: number;
  isFeatured: number;
  likeCount: number;
  localizedDescription: string | null;
  localizedDescriptionSource: string | null;
  localizedTitle: string | null;
  localizedTitleSource: string | null;
  originalDescription: string | null;
  originalTitle: string;
  publishedAt: string;
  thumbnailUrl: string | null;
  viewCount: number;
  youtubeUrl: string;
  youtubeVideoId: string;
}

const toTranslationSource = (
  value: unknown,
): TranslationSource | null => {
  if (
    value === "manual" ||
    value === "youtube_localized" ||
    value === "machine" ||
    value === "original"
  ) {
    return value;
  }

  return null;
};

const mapCategory = (row: AdminCategoryRow): Category => ({
  id: toNumber(row.id),
  slug: toStringValue(row.slug),
  nameKo: toStringValue(row.nameKo),
  sortOrder: toNumber(row.sortOrder),
  isActive: toBoolean(row.isActive),
});

const mapAdminContent = (row: AdminContentSummaryRow): AdminContent => ({
  id: toNumber(row.id),
  categoryId: toNumber(row.categoryId),
  categorySlug: toStringValue(row.categorySlug),
  categoryNameKo: toStringValue(row.categoryNameKo),
  slug: toStringValue(row.slug),
  titleKo: toStringValue(row.titleKo),
  titleEn: toNullableString(row.titleEn),
  releaseYear: row.releaseYear === null ? null : toNumber(row.releaseYear),
  releaseDate: toNullableString(row.releaseDate),
  status: row.status,
  reactionCount: toNumber(row.reactionCount),
  totalViews: toNumber(row.totalViews),
  latestReactionAt: toNullableString(row.latestReactionAt),
});

const mapAdminContentDetail = (row: AdminContentDetailRow): AdminContentDetail => ({
  ...mapAdminContent(row),
  aliases: parseJsonArray(row.aliasesJson),
  thumbnailUrl: toNullableString(row.thumbnailUrl),
  description: toNullableString(row.description),
  searchKeywords: parseJsonArray(row.searchKeywordsJson),
  priorityScore: toNumber(row.priorityScore),
  heroMessageKo: toNullableString(row.heroMessageKo),
});

const mapAdminReaction = (row: AdminReactionRow): AdminReactionVideo => ({
  id: toNumber(row.id),
  youtubeVideoId: toStringValue(row.youtubeVideoId),
  contentId: toNumber(row.contentId),
  contentSlug: toStringValue(row.contentSlug),
  contentTitleKo: toStringValue(row.contentTitleKo),
  categorySlug: toStringValue(row.categorySlug),
  categoryNameKo: toStringValue(row.categoryNameKo),
  channelName: toStringValue(row.channelName),
  originalTitle: toStringValue(row.originalTitle),
  localizedTitle: toNullableString(row.localizedTitle),
  localizedTitleSource: toTranslationSource(row.localizedTitleSource),
  originalDescription: toNullableString(row.originalDescription),
  localizedDescription: toNullableString(row.localizedDescription),
  localizedDescriptionSource: toTranslationSource(row.localizedDescriptionSource),
  adminTitle: toNullableString(row.adminTitle),
  adminDescription: toNullableString(row.adminDescription),
  displayTitle: toStringValue(row.displayTitle),
  thumbnailUrl: toNullableString(row.thumbnailUrl),
  publishedAt: toStringValue(row.publishedAt),
  viewCount: toNumber(row.viewCount),
  likeCount: toNumber(row.likeCount),
  commentCount: toNumber(row.commentCount),
  youtubeUrl: toStringValue(row.youtubeUrl),
  isFeatured: toBoolean(row.isFeatured),
  featuredOrder: toNumber(row.featuredOrder),
});

const normalizeAliases = (aliases: string[]) =>
  Array.from(
    new Set(
      aliases
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );

const normalizeSearchKeywords = (keywords: string[]) =>
  Array.from(
    new Set(
      keywords
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );

const wasRowAffected = (result: D1Result) => Number(result.meta.changes ?? 0) > 0;

export const getAdminCategories = async (db: D1Database): Promise<Category[]> => {
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
        ORDER BY sort_order ASC, id ASC
      `,
    )
    .all<AdminCategoryRow>();

  return (result.results ?? []).map(mapCategory);
};

export const createAdminCategory = async (
  db: D1Database,
  input: {
    isActive: boolean;
    nameKo: string;
    slug: string;
    sortOrder: number;
  },
): Promise<number> => {
  await db
    .prepare(
      `
        INSERT INTO categories (
          slug,
          name_ko,
          sort_order,
          is_active
        )
        VALUES (?, ?, ?, ?)
      `,
    )
    .bind(input.slug, input.nameKo, input.sortOrder, input.isActive ? 1 : 0)
    .run();

  const row = await db
    .prepare(
      `
        SELECT id
        FROM categories
        WHERE slug = ?
      `,
    )
    .bind(input.slug)
    .first<{ id: number }>();

  return toNumber(row?.id);
};

export const updateAdminCategory = async (
  db: D1Database,
  categoryId: number,
  input: {
    isActive: boolean;
    nameKo: string;
    slug: string;
    sortOrder: number;
  },
): Promise<boolean> => {
  const result = await db
    .prepare(
      `
        UPDATE categories
        SET
          slug = ?,
          name_ko = ?,
          sort_order = ?,
          is_active = ?
        WHERE id = ?
      `,
    )
    .bind(input.slug, input.nameKo, input.sortOrder, input.isActive ? 1 : 0, categoryId)
    .run();

  return wasRowAffected(result);
};

export const deleteAdminCategory = async (
  db: D1Database,
  categoryId: number,
): Promise<
  | {
      ok: true;
    }
  | {
      linkedContentCount: number;
      ok: false;
      reason: "has_contents" | "not_found";
    }
> => {
  const categoryRow = await db
    .prepare(
      `
        SELECT id
        FROM categories
        WHERE id = ?
      `,
    )
    .bind(categoryId)
    .first<{ id: number }>();

  if (!categoryRow) {
    return {
      ok: false,
      reason: "not_found",
      linkedContentCount: 0,
    };
  }

  const linkedRow = await db
    .prepare(
      `
        SELECT COUNT(*) AS total
        FROM contents
        WHERE category_id = ?
      `,
    )
    .bind(categoryId)
    .first<{ total: number }>();

  const linkedContentCount = toNumber(linkedRow?.total);

  if (linkedContentCount > 0) {
    return {
      ok: false,
      reason: "has_contents",
      linkedContentCount,
    };
  }

  await db.batch([
    db
      .prepare(
        `
          DELETE FROM ranking_snapshots
          WHERE category_id = ?
        `,
      )
      .bind(categoryId),
    db
      .prepare(
        `
          DELETE FROM categories
          WHERE id = ?
        `,
      )
      .bind(categoryId),
  ]);

  return {
    ok: true,
  };
};

export const getAdminContents = async (db: D1Database): Promise<AdminContent[]> => {
  const result = await db
    .prepare(
      `
        SELECT
          c.id AS id,
          c.category_id AS categoryId,
          cat.slug AS categorySlug,
          cat.name_ko AS categoryNameKo,
          c.slug AS slug,
          c.title_ko AS titleKo,
          c.title_en AS titleEn,
          c.release_year AS releaseYear,
          c.release_date AS releaseDate,
          c.status AS status,
          COUNT(rv.id) AS reactionCount,
          COALESCE(SUM(rv.view_count), 0) AS totalViews,
          MAX(rv.published_at) AS latestReactionAt
        FROM contents c
        JOIN categories cat
          ON cat.id = c.category_id
        LEFT JOIN reaction_videos rv
          ON rv.content_id = c.id
          AND rv.is_overseas_reaction = 1
        GROUP BY
          c.id,
          c.category_id,
          cat.slug,
          cat.name_ko,
          c.slug,
          c.title_ko,
          c.title_en,
          c.release_year,
          c.release_date,
          c.status
        ORDER BY cat.sort_order ASC, c.updated_at DESC, c.id DESC
      `,
    )
    .all<AdminContentSummaryRow>();

  return (result.results ?? []).map(mapAdminContent);
};

export const getAdminContentDetail = async (
  db: D1Database,
  contentId: number,
): Promise<AdminContentDetail | null> => {
  const row = await db
    .prepare(
      `
        SELECT
          c.id AS id,
          c.category_id AS categoryId,
          cat.slug AS categorySlug,
          cat.name_ko AS categoryNameKo,
          c.slug AS slug,
          c.title_ko AS titleKo,
          c.title_en AS titleEn,
          c.aliases_json AS aliasesJson,
          c.release_year AS releaseYear,
          c.release_date AS releaseDate,
          c.thumbnail_url AS thumbnailUrl,
          c.description AS description,
          c.search_keywords_json AS searchKeywordsJson,
          c.priority_score AS priorityScore,
          c.hero_message_ko AS heroMessageKo,
          c.status AS status,
          COUNT(rv.id) AS reactionCount,
          COALESCE(SUM(rv.view_count), 0) AS totalViews,
          MAX(rv.published_at) AS latestReactionAt
        FROM contents c
        JOIN categories cat
          ON cat.id = c.category_id
        LEFT JOIN reaction_videos rv
          ON rv.content_id = c.id
          AND rv.is_overseas_reaction = 1
        WHERE c.id = ?
        GROUP BY
          c.id,
          c.category_id,
          cat.slug,
          cat.name_ko,
          c.slug,
          c.title_ko,
          c.title_en,
          c.aliases_json,
          c.release_year,
          c.release_date,
          c.thumbnail_url,
          c.description,
          c.search_keywords_json,
          c.priority_score,
          c.hero_message_ko,
          c.status
      `,
    )
    .bind(contentId)
    .first<AdminContentDetailRow>();

  return row ? mapAdminContentDetail(row) : null;
};

export const createAdminContent = async (
  db: D1Database,
  input: {
    categoryId: number;
    releaseDate: string | null;
    releaseYear: number | null;
    slug: string;
    status: ContentStatus;
    titleEn: string | null;
    titleKo: string;
  },
): Promise<number> => {
  await db
    .prepare(
      `
        INSERT INTO contents (
          category_id,
          slug,
          title_ko,
          title_en,
          aliases_json,
          release_year,
          release_date,
          thumbnail_url,
          description,
          search_keywords_json,
          priority_score,
          hero_message_ko,
          status,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
    )
    .bind(
      input.categoryId,
      input.slug,
      input.titleKo,
      input.titleEn,
      JSON.stringify([]),
      input.releaseYear,
      input.releaseDate,
      null,
      null,
      JSON.stringify([]),
      0,
      null,
      input.status,
    )
    .run();

  const row = await db
    .prepare(
      `
        SELECT id
        FROM contents
        WHERE slug = ?
      `,
    )
    .bind(input.slug)
    .first<{ id: number }>();

  return toNumber(row?.id);
};

export const updateAdminContent = async (
  db: D1Database,
  contentId: number,
  input: {
    aliases: string[];
    categoryId: number;
    description: string | null;
    heroMessageKo: string | null;
    priorityScore: number;
    releaseDate: string | null;
    releaseYear: number | null;
    searchKeywords: string[];
    slug: string;
    status: ContentStatus;
    thumbnailUrl: string | null;
    titleEn: string | null;
    titleKo: string;
  },
): Promise<boolean> => {
  const result = await db
    .prepare(
      `
        UPDATE contents
        SET
          category_id = ?,
          slug = ?,
          title_ko = ?,
          title_en = ?,
          aliases_json = ?,
          release_year = ?,
          release_date = ?,
          thumbnail_url = ?,
          description = ?,
          search_keywords_json = ?,
          priority_score = ?,
          hero_message_ko = ?,
          status = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
    )
    .bind(
      input.categoryId,
      input.slug,
      input.titleKo,
      input.titleEn,
      JSON.stringify(normalizeAliases(input.aliases)),
      input.releaseYear,
      input.releaseDate,
      input.thumbnailUrl,
      input.description,
      JSON.stringify(normalizeSearchKeywords(input.searchKeywords)),
      input.priorityScore,
      input.heroMessageKo,
      input.status,
      contentId,
    )
    .run();

  return wasRowAffected(result);
};

export const deleteAdminContent = async (
  db: D1Database,
  contentId: number,
): Promise<boolean> => {
  const existing = await db
    .prepare(
      `
        SELECT slug
        FROM contents
        WHERE id = ?
      `,
    )
    .bind(contentId)
    .first<{ slug: string }>();

  if (!existing?.slug) {
    return false;
  }

  await db.batch([
    db
      .prepare(
        `
          DELETE FROM ranking_snapshots
          WHERE content_id = ?
        `,
      )
      .bind(contentId),
    db
      .prepare(
        `
          DELETE FROM editorial_entries
          WHERE target_type = 'content'
            AND target_ref = ?
        `,
      )
      .bind(existing.slug),
    db
      .prepare(
        `
          DELETE FROM reaction_videos
          WHERE content_id = ?
        `,
      )
      .bind(contentId),
    db
      .prepare(
        `
          DELETE FROM contents
          WHERE id = ?
        `,
      )
      .bind(contentId),
  ]);

  return true;
};

export const getAdminReactions = async (
  db: D1Database,
  options: {
    featuredOnly?: boolean;
    limit?: number;
  } = {},
): Promise<AdminReactionVideo[]> => {
  const filters = ["rv.is_overseas_reaction = 1"];
  const bindings: unknown[] = [];

  if (options.featuredOnly) {
    filters.push("rv.is_featured_home = 1");
  }

  const limit = options.limit ?? 60;

  const result = await db
    .prepare(
      `
        SELECT
          rv.id AS id,
          rv.youtube_video_id AS youtubeVideoId,
          rv.content_id AS contentId,
          c.slug AS contentSlug,
          c.title_ko AS contentTitleKo,
          cat.slug AS categorySlug,
          cat.name_ko AS categoryNameKo,
          ch.title AS channelName,
          rv.title AS originalTitle,
          rv.description AS originalDescription,
          rv.localized_title AS localizedTitle,
          rv.localized_title_source AS localizedTitleSource,
          rv.localized_description AS localizedDescription,
          rv.localized_description_source AS localizedDescriptionSource,
          rv.admin_title AS adminTitle,
          rv.admin_description AS adminDescription,
          COALESCE(rv.admin_title, rv.localized_title, rv.title) AS displayTitle,
          rv.thumbnail_url AS thumbnailUrl,
          rv.published_at AS publishedAt,
          rv.view_count AS viewCount,
          rv.like_count AS likeCount,
          rv.comment_count AS commentCount,
          rv.youtube_url AS youtubeUrl,
          rv.is_featured_home AS isFeatured,
          rv.featured_home_order AS featuredOrder
        FROM reaction_videos rv
        JOIN contents c
          ON c.id = rv.content_id
        JOIN categories cat
          ON cat.id = c.category_id
        JOIN channels ch
          ON ch.id = rv.channel_id
        WHERE ${filters.join(" AND ")}
        ORDER BY
          rv.is_featured_home DESC,
          CASE WHEN rv.featured_home_order = 0 THEN 9999 ELSE rv.featured_home_order END ASC,
          rv.published_at DESC,
          rv.id DESC
        LIMIT ?
      `,
    )
    .bind(...bindings, limit)
    .all<AdminReactionRow>();

  return (result.results ?? []).map(mapAdminReaction);
};

export const updateAdminReaction = async (
  db: D1Database,
  youtubeVideoId: string,
  input: {
    adminDescription: string | null;
    adminTitle: string | null;
    featuredOrder: number;
    isFeatured: boolean;
  },
): Promise<boolean> => {
  const result = await db
    .prepare(
      `
        UPDATE reaction_videos
        SET
          admin_title = ?,
          admin_description = ?,
          is_featured_home = ?,
          featured_home_order = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE youtube_video_id = ?
      `,
    )
    .bind(
      input.adminTitle,
      input.adminDescription,
      input.isFeatured ? 1 : 0,
      input.isFeatured ? input.featuredOrder : 0,
      youtubeVideoId,
    )
    .run();

  return wasRowAffected(result);
};

export const getAdminDashboard = async (db: D1Database): Promise<AdminDashboardPayload> => {
  const [settings, categories, contents, featuredReactions, reactions] = await Promise.all([
    getHomeSiteCopy(db),
    getAdminCategories(db),
    getAdminContents(db),
    getAdminReactions(db, {
      featuredOnly: true,
      limit: 12,
    }),
    getAdminReactions(db, {
      limit: 80,
    }),
  ]);

  return {
    settings,
    categories,
    contents,
    featuredReactions,
    reactions,
  };
};

export const saveAdminHomeSettings = async (
  db: D1Database,
  input: HomeSiteCopy,
): Promise<void> => {
  await upsertHomeSiteCopy(db, input);
};
