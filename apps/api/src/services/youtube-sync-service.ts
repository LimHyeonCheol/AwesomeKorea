import type { InternalJobResult } from "@awesomekorea/shared";

import {
  getActiveContentsForSync,
  getStoredReactionVideosForContent,
  setReactionVideoOverseasFlag,
  upsertChannel,
  upsertReactionVideo,
  type SyncContent,
} from "../repositories/catalog-repository";
import {
  buildSearchKeywords,
  containsKoreanCharacters,
  matchesContentReference,
} from "./youtube-reaction-matcher";
import { localizeReactionMetadata } from "./reaction-localization-service";

interface YouTubeSearchItem {
  id?: {
    videoId?: string;
  };
}

interface YouTubeSearchResponse {
  items?: YouTubeSearchItem[];
}

interface YouTubeVideoResponse {
  items?: Array<{
    id?: string;
    snippet?: {
      channelId?: string;
      channelTitle?: string;
      description?: string;
      defaultAudioLanguage?: string;
      defaultLanguage?: string;
      localized?: {
        description?: string;
        title?: string;
      };
      publishedAt?: string;
      thumbnails?: {
        high?: {
          url?: string;
        };
        medium?: {
          url?: string;
        };
      };
      title?: string;
    };
    statistics?: {
      commentCount?: string;
      likeCount?: string;
      viewCount?: string;
    };
  }>;
}

interface SyncYoutubeOptions {
  contentSlug?: string;
  limitPerKeyword?: number;
  maxContents?: number;
}

const REACTION_KEYWORDS = [
  "reaction",
  "reacts",
  "first time watching",
  "review",
  "ending explained",
  "analysis",
];

const KOREAN_CHANNEL_HINTS = ["리액션", "한국", "korean"];
const VALID_YOUTUBE_VIDEO_ID_LENGTH = 11;

const uniqueValues = (values: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value.trim();

    if (!normalized || seen.has(normalized.toLowerCase())) {
      continue;
    }

    seen.add(normalized.toLowerCase());
    result.push(normalized);
  }

  return result;
};

const inferIsOverseasReaction = (
  videoTitle: string,
  channelName: string,
  language: string | null,
) => {
  const normalizedTitle = videoTitle.toLowerCase();
  const normalizedChannel = channelName.toLowerCase();
  const hasReactionKeyword = REACTION_KEYWORDS.some((keyword) => normalizedTitle.includes(keyword));
  const looksMostlyKorean =
    containsKoreanCharacters(videoTitle) &&
    !REACTION_KEYWORDS.some((keyword) => normalizedTitle.includes(keyword));
  const hasKoreanChannelHint = KOREAN_CHANNEL_HINTS.some((keyword) =>
    normalizedChannel.includes(keyword),
  );
  const languageSuggestsKorean = language?.toLowerCase().startsWith("ko") ?? false;

  return hasReactionKeyword && !looksMostlyKorean && !hasKoreanChannelHint && !languageSuggestsKorean;
};

const fetchJson = async <T>(url: URL) => {
  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`YouTube API 요청 실패: ${response.status} ${body}`);
  }

  return (await response.json()) as T;
};

const fetchVideoIdsForKeyword = async (
  apiKey: string,
  query: string,
  limit: number,
) => {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.search = new URLSearchParams({
    key: apiKey,
    part: "snippet",
    type: "video",
    maxResults: String(limit),
    q: query,
    order: "relevance",
  }).toString();

  const response = await fetchJson<YouTubeSearchResponse>(url);

  return uniqueValues(
    (response.items ?? [])
      .map((item) => item.id?.videoId ?? "")
      .filter((videoId) => videoId.length > 0),
  );
};

const fetchVideoDetails = async (apiKey: string, videoIds: string[]) => {
  if (videoIds.length === 0) {
    return [];
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.search = new URLSearchParams({
    key: apiKey,
    part: "snippet,statistics",
    hl: "ko",
    id: videoIds.join(","),
    maxResults: String(videoIds.length),
  }).toString();

  const response = await fetchJson<YouTubeVideoResponse>(url);
  return response.items ?? [];
};

export const syncYoutubeReactions = async (
  env: {
    DB: D1Database;
    DEEPL_API_KEY?: string;
    DEEPL_API_URL?: string;
    GOOGLE_TRANSLATE_API_KEY?: string;
    PAPAGO_CLIENT_ID?: string;
    PAPAGO_CLIENT_SECRET?: string;
    TRANSLATION_PROVIDER?: string;
    YOUTUBE_API_KEY?: string;
  },
  options: SyncYoutubeOptions = {},
): Promise<InternalJobResult> => {
  const apiKey = env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      processedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      summary: "YOUTUBE_API_KEY가 없어 YouTube 동기화를 실행하지 못했습니다.",
      errors: ["missing_youtube_api_key"],
    };
  }

  const activeContents = await getActiveContentsForSync(env.DB);
  const targetContents = activeContents
    .filter((content) => !options.contentSlug || content.slug === options.contentSlug)
    .slice(0, options.maxContents ?? activeContents.length);

  let processedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  for (const content of targetContents) {
    processedCount += 1;

    try {
      const keywords = buildSearchKeywords(content);
      const discoveredVideoIds = new Set<string>();

      for (const keyword of keywords) {
        const videoIds = await fetchVideoIdsForKeyword(apiKey, keyword, options.limitPerKeyword ?? 5);

        for (const videoId of videoIds) {
          discoveredVideoIds.add(videoId);
        }
      }

      const videoDetails = await fetchVideoDetails(apiKey, [...discoveredVideoIds]);
      const matchedVideoDetails = videoDetails.filter((video) =>
        matchesContentReference(content, video.snippet?.title ?? ""),
      );
      const storedReactionVideos = await getStoredReactionVideosForContent(env.DB, content.id);

      for (const storedReaction of storedReactionVideos) {
        if (matchesContentReference(content, storedReaction.title)) {
          continue;
        }

        await setReactionVideoOverseasFlag(env.DB, storedReaction.youtubeVideoId, false);
      }

      for (const video of matchedVideoDetails) {
        const youtubeVideoId = video.id ?? "";

        if (youtubeVideoId.length !== VALID_YOUTUBE_VIDEO_ID_LENGTH) {
          skippedCount += 1;
          continue;
        }

        const title = video.snippet?.title ?? "";
        const description = video.snippet?.description?.trim() || null;
        const channelTitle = video.snippet?.channelTitle ?? "Unknown Channel";
        const detectedLanguage =
          video.snippet?.defaultAudioLanguage ?? video.snippet?.defaultLanguage ?? null;
        const isOverseasReaction = inferIsOverseasReaction(
          title,
          channelTitle,
          detectedLanguage,
        );

        const channelId = await upsertChannel(env.DB, {
          youtubeChannelId: video.snippet?.channelId ?? `unknown-${youtubeVideoId}`,
          title: channelTitle,
          defaultLanguage: detectedLanguage,
          isKoreanChannel: false,
        });

        if (!channelId) {
          skippedCount += 1;
          continue;
        }

        const localization = await localizeReactionMetadata(env, {
          title,
          description,
          localizedTitleCandidate: video.snippet?.localized?.title ?? null,
          localizedDescriptionCandidate: video.snippet?.localized?.description ?? null,
          sourceLanguage: detectedLanguage,
          channelName: channelTitle,
          contentTitleKo: content.titleKo,
          contentTitleEn: content.titleEn,
          categoryName: content.categoryNameKo,
          aliases: content.aliases,
        });

        await upsertReactionVideo(env.DB, {
          youtubeVideoId,
          contentId: content.id,
          channelId,
          title,
          description,
          localizedTitle: localization.title.localizedText,
          localizedTitleSource: localization.title.source,
          localizedDescription: localization.description.localizedText,
          localizedDescriptionSource: localization.description.source,
          thumbnailUrl:
            video.snippet?.thumbnails?.high?.url ?? video.snippet?.thumbnails?.medium?.url ?? null,
          publishedAt: video.snippet?.publishedAt ?? new Date().toISOString(),
          viewCount: Number(video.statistics?.viewCount ?? 0),
          likeCount: Number(video.statistics?.likeCount ?? 0),
          commentCount: Number(video.statistics?.commentCount ?? 0),
          detectedLanguage,
          isOverseasReaction,
          youtubeUrl: `https://www.youtube.com/watch?v=${youtubeVideoId}`,
        });

        updatedCount += 1;
      }
    } catch (error) {
      skippedCount += 1;
      errors.push(`${content.slug}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return {
    success: errors.length === 0,
    processedCount,
    updatedCount,
    skippedCount,
    summary: `${processedCount}개 콘텐츠를 기준으로 YouTube 반응 동기화를 수행했습니다.`,
    errors,
  };
};
