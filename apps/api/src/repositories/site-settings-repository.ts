import type {
  CategorySlug,
  HomeFeaturedReaction,
  HomeSiteCopy,
  ReactionVideo,
  TranslationSource,
} from "@awesomekorea/shared";

import { toNullableString, toNumber, toStringValue } from "../lib/serializers";

interface SettingRow {
  settingKey: string;
  valueText: string;
}

interface FeaturedReactionRow {
  categoryNameKo: string;
  categorySlug: CategorySlug;
  channelName: string;
  commentCount: number;
  contentSlug: string;
  contentTitle: string;
  displayDescription: string | null;
  descriptionSource: string | null;
  displayTitle: string;
  featuredOrder: number;
  id: number;
  likeCount: number;
  originalDescription: string | null;
  originalTitle: string;
  publishedAt: string;
  reactionCount: number;
  thumbnailUrl: string | null;
  titleSource: string | null;
  totalViews: number;
  viewCount: number;
  youtubeVideoId: string;
}

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

export const HOME_SITE_COPY_DEFAULTS: HomeSiteCopy = {
  brandName: "어썸코리아",
  brandTagline: "Awesome Korea - 해외 반응 모음",
  heroBadge: "관리자 추천",
  heroToolbarCopy: "운영자가 직접 고른 해외 유튜브 반응을 메인에서 빠르게 살펴보세요.",
  heroTitle: "지금 소개할 대표 반응을 운영자가 직접 편성합니다.",
  heroDescription:
    "대문 문구, 카테고리, 유튜브 제목과 소개글, 메인 대표 반응까지 모두 관리자에서 조정할 수 있습니다.",
};

const HOME_SITE_COPY_KEYS: Record<keyof HomeSiteCopy, string> = {
  brandName: "site.brandName",
  brandTagline: "site.brandTagline",
  heroBadge: "home.heroBadge",
  heroToolbarCopy: "home.heroToolbarCopy",
  heroTitle: "home.heroTitle",
  heroDescription: "home.heroDescription",
};

const mapReactionVideo = (row: FeaturedReactionRow): ReactionVideo => ({
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

export const getHomeSiteCopy = async (db: D1Database): Promise<HomeSiteCopy> => {
  const result = await db
    .prepare(
      `
        SELECT
          setting_key AS settingKey,
          value_text AS valueText
        FROM app_settings
        WHERE setting_key IN (?, ?, ?, ?, ?, ?)
      `,
    )
    .bind(...Object.values(HOME_SITE_COPY_KEYS))
    .all<SettingRow>();

  const settingsByKey = new Map<string, string>();

  for (const row of result.results ?? []) {
    settingsByKey.set(toStringValue(row.settingKey), toStringValue(row.valueText));
  }

  return {
    brandName: settingsByKey.get(HOME_SITE_COPY_KEYS.brandName) ?? HOME_SITE_COPY_DEFAULTS.brandName,
    brandTagline:
      settingsByKey.get(HOME_SITE_COPY_KEYS.brandTagline) ?? HOME_SITE_COPY_DEFAULTS.brandTagline,
    heroBadge: settingsByKey.get(HOME_SITE_COPY_KEYS.heroBadge) ?? HOME_SITE_COPY_DEFAULTS.heroBadge,
    heroToolbarCopy:
      settingsByKey.get(HOME_SITE_COPY_KEYS.heroToolbarCopy) ??
      HOME_SITE_COPY_DEFAULTS.heroToolbarCopy,
    heroTitle: settingsByKey.get(HOME_SITE_COPY_KEYS.heroTitle) ?? HOME_SITE_COPY_DEFAULTS.heroTitle,
    heroDescription:
      settingsByKey.get(HOME_SITE_COPY_KEYS.heroDescription) ??
      HOME_SITE_COPY_DEFAULTS.heroDescription,
  };
};

export const upsertHomeSiteCopy = async (
  db: D1Database,
  input: HomeSiteCopy,
): Promise<void> => {
  for (const [fieldName, settingKey] of Object.entries(HOME_SITE_COPY_KEYS) as Array<
    [keyof HomeSiteCopy, string]
  >) {
    await db
      .prepare(
        `
          INSERT INTO app_settings (
            setting_key,
            value_text,
            updated_at
          )
          VALUES (?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(setting_key) DO UPDATE SET
            value_text = excluded.value_text,
            updated_at = CURRENT_TIMESTAMP
        `,
      )
      .bind(settingKey, input[fieldName])
      .run();
  }
};

export const getFeaturedHomeReactions = async (
  db: D1Database,
): Promise<HomeFeaturedReaction[]> => {
  const result = await db
    .prepare(
      `
        WITH content_stats AS (
          SELECT
            content_id AS contentId,
            COUNT(id) AS reactionCount,
            COALESCE(SUM(view_count), 0) AS totalViews
          FROM reaction_videos
          WHERE is_overseas_reaction = 1
          GROUP BY content_id
        )
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
          ch.title AS channelName,
          rv.featured_home_order AS featuredOrder,
          c.slug AS contentSlug,
          c.title_ko AS contentTitle,
          cat.slug AS categorySlug,
          cat.name_ko AS categoryNameKo,
          COALESCE(cs.reactionCount, 0) AS reactionCount,
          COALESCE(cs.totalViews, 0) AS totalViews
        FROM reaction_videos rv
        JOIN contents c
          ON c.id = rv.content_id
        JOIN categories cat
          ON cat.id = c.category_id
        JOIN channels ch
          ON ch.id = rv.channel_id
        LEFT JOIN content_stats cs
          ON cs.contentId = c.id
        WHERE rv.is_featured_home = 1
          AND c.status = 'active'
          AND cat.is_active = 1
        ORDER BY rv.featured_home_order ASC, rv.published_at DESC, rv.id ASC
        LIMIT 8
      `,
    )
    .all<FeaturedReactionRow>();

  return (result.results ?? []).map((row) => ({
    sortOrder: toNumber(row.featuredOrder),
    contentSlug: toStringValue(row.contentSlug),
    contentTitle: toStringValue(row.contentTitle),
    categorySlug: row.categorySlug,
    categoryNameKo: toStringValue(row.categoryNameKo),
    reactionCount: toNumber(row.reactionCount),
    totalViews: toNumber(row.totalViews),
    reaction: mapReactionVideo(row),
  }));
};
