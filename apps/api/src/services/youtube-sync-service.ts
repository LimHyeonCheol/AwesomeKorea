import type { InternalJobResult } from "@awesomekorea/shared";

import {
  getActiveContentsForSync,
  getStoredReactionVideosForContent,
  setReactionVideoOverseasFlag,
  upsertChannel,
  upsertReactionVideo,
  type SyncContent,
} from "../repositories/catalog-repository";

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
      defaultAudioLanguage?: string;
      defaultLanguage?: string;
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

const containsKoreanCharacters = (value: string) => /[가-힣]/.test(value);

const normalizeText = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, " ")
    .trim();

const isStrongReference = (value: string) => {
  const normalized = normalizeText(value);

  if (normalized.length === 0) {
    return false;
  }

  if (containsKoreanCharacters(value)) {
    return normalized.length >= 2;
  }

  return normalized.length >= 5 || normalized.split(" ").length >= 2;
};

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

const buildContentReferences = (content: SyncContent) =>
  uniqueValues([content.titleKo, content.titleEn ?? "", ...content.aliases]).map(normalizeText);

const buildSearchKeywords = (content: SyncContent) =>
  uniqueValues([
    content.titleEn && isStrongReference(content.titleEn) ? `${content.titleEn} reaction` : "",
    content.titleEn && isStrongReference(content.titleEn)
      ? `${content.titleEn} first time watching`
      : "",
    `${content.titleKo} reaction`,
    `${content.titleKo} 해외반응`,
    ...content.aliases.flatMap((alias) =>
      isStrongReference(alias) ? [`${alias} reaction`, `${alias} first time watching`] : [],
    ),
  ]).slice(0, 8);

const matchesContentReference = (content: SyncContent, videoTitle: string) => {
  const normalizedTitle = normalizeText(videoTitle);
  const references = buildContentReferences(content);
  const strongReferences = references.filter((reference) => isStrongReference(reference));
  const candidateReferences = strongReferences.length > 0 ? strongReferences : references;

  if (strongReferences.some((reference) => normalizedTitle.includes(reference))) {
    return true;
  }

  const titleTokens = new Set(normalizedTitle.split(" ").filter((token) => token.length > 0));

  return candidateReferences.some((reference) => {
    const referenceTokens = reference.split(" ").filter((token) => token.length >= 3);

    return referenceTokens.length > 0 && referenceTokens.every((token) => titleTokens.has(token));
  });
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
    order: "date",
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
    id: videoIds.join(","),
    maxResults: String(videoIds.length),
  }).toString();

  const response = await fetchJson<YouTubeVideoResponse>(url);
  return response.items ?? [];
};

export const syncYoutubeReactions = async (
  env: {
    DB: D1Database;
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
    .slice(0, options.maxContents ?? 8);

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

        await upsertReactionVideo(env.DB, {
          youtubeVideoId,
          contentId: content.id,
          channelId,
          title,
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
