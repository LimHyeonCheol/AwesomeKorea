import type {
  ReactionComment,
  ReactionCommentRepliesPayload,
  ReactionCommentReply,
  ReactionCommentsPayload,
  TranslationSource,
} from "@awesomekorea/shared";

import type { ReactionTranslationContext } from "../repositories/catalog-repository";
import {
  buildReactionTranslationGlossary,
  pickFirstSentence,
  shouldSkipKoreanTranslation,
  translateTextToKorean,
} from "./translation-service";

const YOUTUBE_COMMENT_THREADS_API_URL = "https://www.googleapis.com/youtube/v3/commentThreads";
const YOUTUBE_COMMENTS_API_URL = "https://www.googleapis.com/youtube/v3/comments";
const DEFAULT_TOP_COMMENT_LIMIT = 20;
const MAX_TOP_COMMENT_LIMIT = 50;
const REPLY_PAGE_SIZE = 50;

interface YoutubeCommentSnippet {
  authorDisplayName?: string;
  authorProfileImageUrl?: string;
  likeCount?: number;
  publishedAt?: string;
  textDisplay?: string;
  textOriginal?: string;
  updatedAt?: string;
}

interface YoutubeCommentResource {
  id?: string;
  snippet?: YoutubeCommentSnippet;
}

interface YoutubeCommentThreadSnippet {
  topLevelComment?: YoutubeCommentResource;
  totalReplyCount?: number;
}

interface YoutubeCommentThread {
  id?: string;
  snippet?: YoutubeCommentThreadSnippet;
}

interface YoutubeCommentThreadsResponse {
  items?: YoutubeCommentThread[];
  nextPageToken?: string;
}

interface YoutubeCommentsResponse {
  items?: YoutubeCommentResource[];
  nextPageToken?: string;
}

interface YoutubeApiErrorResponse {
  error?: {
    errors?: Array<{
      message?: string;
      reason?: string;
    }>;
    message?: string;
  };
}

interface TranslationEnv {
  DEEPL_API_KEY?: string;
  DEEPL_API_URL?: string;
  GOOGLE_TRANSLATE_API_KEY?: string;
  PAPAGO_CLIENT_ID?: string;
  PAPAGO_CLIENT_SECRET?: string;
  TRANSLATION_PROVIDER?: string;
}

interface RawCommentBody {
  authorDisplayName: string;
  authorProfileImageUrl: string | null;
  id: string;
  likeCount: number;
  publishedAt: string;
  replyCount: number;
  text: string;
  updatedAt: string;
}

interface CommentLocalizationResult {
  hasTranslation: boolean;
  originalText: string;
  text: string;
  translationSource: TranslationSource;
}

class YoutubeCommentsUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "YoutubeCommentsUnavailableError";
  }
}

const createBasePayload = (
  videoId: string,
  totalCommentCount: number,
  limit: number,
): Omit<
  ReactionCommentsPayload,
  "fetchedAll" | "fetchedCount" | "items" | "message" | "status"
> => ({
  locale: "ko",
  videoId,
  order: "relevance",
  strategy: totalCommentCount > limit ? "topN" : "full",
  pageSize: limit,
  totalCommentCount,
  estimatedQuotaUnits: totalCommentCount > 0 ? 1 : 0,
});

const createBaseRepliesPayload = (
  videoId: string,
  commentId: string,
): Omit<ReactionCommentRepliesPayload, "fetchedCount" | "items" | "message" | "status"> => ({
  locale: "ko",
  videoId,
  commentId,
  estimatedQuotaUnits: 1,
});

const createUnavailableCommentsPayload = (
  videoId: string,
  totalCommentCount: number,
  message: string,
  limit = DEFAULT_TOP_COMMENT_LIMIT,
): ReactionCommentsPayload => ({
  ...createBasePayload(videoId, totalCommentCount, limit),
  status: "unavailable",
  items: [],
  fetchedAll: false,
  fetchedCount: 0,
  message,
});

const createDisabledCommentsPayload = (
  videoId: string,
  totalCommentCount: number,
  limit = DEFAULT_TOP_COMMENT_LIMIT,
): ReactionCommentsPayload => ({
  ...createBasePayload(videoId, totalCommentCount, limit),
  status: "disabled",
  items: [],
  fetchedAll: false,
  fetchedCount: 0,
  message: "이 영상은 유튜브에서 댓글 기능이 꺼져 있어 한국어 댓글을 불러올 수 없어요.",
});

const createEmptyCommentsPayload = (
  videoId: string,
  totalCommentCount: number,
  limit = DEFAULT_TOP_COMMENT_LIMIT,
): ReactionCommentsPayload => ({
  ...createBasePayload(videoId, totalCommentCount, limit),
  status: "empty",
  items: [],
  fetchedAll: true,
  fetchedCount: 0,
  message: "아직 표시할 댓글이 없어요.",
});

const createUnavailableRepliesPayload = (
  videoId: string,
  commentId: string,
  message: string,
): ReactionCommentRepliesPayload => ({
  ...createBaseRepliesPayload(videoId, commentId),
  status: "unavailable",
  items: [],
  fetchedCount: 0,
  message,
});

const createEmptyRepliesPayload = (
  videoId: string,
  commentId: string,
): ReactionCommentRepliesPayload => ({
  ...createBaseRepliesPayload(videoId, commentId),
  status: "empty",
  items: [],
  fetchedCount: 0,
  message: "표시할 답글이 없어요.",
});

const normalizeTopCommentLimit = (value: number | undefined) => {
  if (!value || !Number.isFinite(value)) {
    return DEFAULT_TOP_COMMENT_LIMIT;
  }

  return Math.max(1, Math.min(MAX_TOP_COMMENT_LIMIT, Math.trunc(value)));
};

const toYoutubeErrorResponse = (value: unknown): YoutubeApiErrorResponse => {
  if (typeof value !== "object" || value === null) {
    return {};
  }

  return value as YoutubeApiErrorResponse;
};

const resolveYoutubeErrorMessage = (payload: YoutubeApiErrorResponse) => {
  const reason = payload.error?.errors?.[0]?.reason ?? "";
  const message = payload.error?.errors?.[0]?.message ?? payload.error?.message ?? "";

  if (reason === "commentsDisabled") {
    return {
      message: "comments_disabled",
      shouldThrow: false,
    };
  }

  if (reason === "quotaExceeded") {
    return {
      message: "유튜브 댓글 조회 할당량이 일시적으로 소진되어 잠시 후 다시 시도해 주세요.",
      shouldThrow: true,
    };
  }

  if (reason === "videoNotFound") {
    return {
      message: "영상을 찾을 수 없어 댓글을 불러오지 못했어요.",
      shouldThrow: true,
    };
  }

  if (reason === "keyInvalid" || reason === "accessNotConfigured") {
    return {
      message: "유튜브 댓글 API 설정을 확인한 뒤 다시 시도해 주세요.",
      shouldThrow: true,
    };
  }

  return {
    message: message || "유튜브 댓글을 불러오는 중 문제가 발생했어요.",
    shouldThrow: true,
  };
};

const mapRawCommentBody = (comment: YoutubeCommentResource): RawCommentBody => {
  const originalText = comment.snippet?.textOriginal?.trim() || comment.snippet?.textDisplay?.trim() || "";
  const publishedAt = comment.snippet?.publishedAt ?? new Date(0).toISOString();

  return {
    id: comment.id ?? crypto.randomUUID(),
    authorDisplayName: comment.snippet?.authorDisplayName?.trim() || "익명 시청자",
    authorProfileImageUrl: comment.snippet?.authorProfileImageUrl?.trim() || null,
    text: originalText,
    likeCount: comment.snippet?.likeCount ?? 0,
    publishedAt,
    updatedAt: comment.snippet?.updatedAt ?? publishedAt,
    replyCount: 0,
  };
};

const mapThreadToRawComment = (thread: YoutubeCommentThread): RawCommentBody | null => {
  const topLevelComment = thread.snippet?.topLevelComment;

  if (!topLevelComment) {
    return null;
  }

  const rawComment = mapRawCommentBody(topLevelComment);

  return {
    ...rawComment,
    replyCount: thread.snippet?.totalReplyCount ?? 0,
  };
};

const fetchCommentThreads = async (
  apiKey: string,
  videoId: string,
  limit: number,
) => {
  const url = new URL(YOUTUBE_COMMENT_THREADS_API_URL);

  url.searchParams.set("part", "snippet");
  url.searchParams.set("videoId", videoId);
  url.searchParams.set("maxResults", String(limit));
  url.searchParams.set("order", "relevance");
  url.searchParams.set("textFormat", "plainText");
  url.searchParams.set("key", apiKey);

  const response = await fetch(url);
  const payload = (await response.json()) as YoutubeCommentThreadsResponse | YoutubeApiErrorResponse;

  if (!response.ok) {
    const resolvedError = resolveYoutubeErrorMessage(toYoutubeErrorResponse(payload));

    if (resolvedError.message === "comments_disabled") {
      return {
        disabled: true,
        payload: null,
      };
    }

    if (resolvedError.shouldThrow) {
      throw new YoutubeCommentsUnavailableError(resolvedError.message);
    }
  }

  return {
    disabled: false,
    payload: payload as YoutubeCommentThreadsResponse,
  };
};

const fetchCommentReplies = async (
  apiKey: string,
  commentId: string,
) => {
  const url = new URL(YOUTUBE_COMMENTS_API_URL);

  url.searchParams.set("part", "snippet");
  url.searchParams.set("parentId", commentId);
  url.searchParams.set("maxResults", String(REPLY_PAGE_SIZE));
  url.searchParams.set("textFormat", "plainText");
  url.searchParams.set("key", apiKey);

  const response = await fetch(url);
  const payload = (await response.json()) as YoutubeCommentsResponse | YoutubeApiErrorResponse;

  if (!response.ok) {
    const resolvedError = resolveYoutubeErrorMessage(toYoutubeErrorResponse(payload));

    if (resolvedError.shouldThrow) {
      throw new YoutubeCommentsUnavailableError(resolvedError.message);
    }
  }

  return payload as YoutubeCommentsResponse;
};

const localizeCommentText = async (
  env: TranslationEnv,
  context: ReactionTranslationContext,
  text: string,
): Promise<CommentLocalizationResult> => {
  const normalizedText = text.trim();

  if (!normalizedText || shouldSkipKoreanTranslation(normalizedText)) {
    return {
      text: normalizedText,
      originalText: normalizedText,
      translationSource: "original",
      hasTranslation: false,
    };
  }

  const translated = await translateTextToKorean(env, {
    text: normalizedText,
    glossary: buildReactionTranslationGlossary({
      contentTitleKo: context.contentTitleKo,
      contentTitleEn: context.contentTitleEn,
      channelName: context.channelName,
    }),
    context: {
      channelName: context.channelName,
      contentTitleKo: context.contentTitleKo,
      contentTitleEn: context.contentTitleEn,
      categoryName: context.categoryNameKo,
      description: pickFirstSentence(context.description),
    },
  });

  if (!translated || translated.translatedText === normalizedText) {
    return {
      text: normalizedText,
      originalText: normalizedText,
      translationSource: "original",
      hasTranslation: false,
    };
  }

  return {
    text: translated.translatedText,
    originalText: normalizedText,
    translationSource: "machine",
    hasTranslation: true,
  };
};

const localizeTopLevelComment = async (
  env: TranslationEnv,
  context: ReactionTranslationContext,
  comment: RawCommentBody,
): Promise<ReactionComment> => {
  const localized = await localizeCommentText(env, context, comment.text);

  return {
    id: comment.id,
    authorDisplayName: comment.authorDisplayName,
    authorProfileImageUrl: comment.authorProfileImageUrl,
    text: localized.text,
    originalText: localized.originalText,
    translationSource: localized.translationSource,
    hasTranslation: localized.hasTranslation,
    likeCount: comment.likeCount,
    publishedAt: comment.publishedAt,
    updatedAt: comment.updatedAt,
    replyCount: comment.replyCount,
    replies: [],
  };
};

const localizeReplyComment = async (
  env: TranslationEnv,
  context: ReactionTranslationContext,
  comment: RawCommentBody,
): Promise<ReactionCommentReply> => {
  const localized = await localizeCommentText(env, context, comment.text);

  return {
    id: comment.id,
    authorDisplayName: comment.authorDisplayName,
    authorProfileImageUrl: comment.authorProfileImageUrl,
    text: localized.text,
    originalText: localized.originalText,
    translationSource: localized.translationSource,
    hasTranslation: localized.hasTranslation,
    likeCount: comment.likeCount,
    publishedAt: comment.publishedAt,
  };
};

export const getYoutubeReactionComments = async (input: {
  apiKey: string;
  context: ReactionTranslationContext;
  env: TranslationEnv;
  limit?: number;
}): Promise<ReactionCommentsPayload> => {
  const limit = normalizeTopCommentLimit(input.limit);

  if (input.context.commentCount <= 0) {
    return createEmptyCommentsPayload(input.context.youtubeVideoId, input.context.commentCount, limit);
  }

  const response = await fetchCommentThreads(input.apiKey, input.context.youtubeVideoId, limit);

  if (response.disabled) {
    return createDisabledCommentsPayload(input.context.youtubeVideoId, input.context.commentCount, limit);
  }

  const rawComments =
    response.payload?.items
      ?.map(mapThreadToRawComment)
      .filter((comment): comment is RawCommentBody => comment !== null && comment.text.length > 0) ?? [];

  if (rawComments.length === 0) {
    return createEmptyCommentsPayload(input.context.youtubeVideoId, input.context.commentCount, limit);
  }

  const items = await Promise.all(
    rawComments.map((comment) => localizeTopLevelComment(input.env, input.context, comment)),
  );
  const fetchedAll = input.context.commentCount <= limit && !response.payload?.nextPageToken;
  const strategy = input.context.commentCount > limit ? "topN" : "full";
  const message =
    strategy === "topN"
      ? `댓글은 비용과 속도를 고려해 상위 ${limit}개를 먼저 한국어로 보여주고, 답글은 펼칠 때 번역해요.`
      : "댓글 수가 많지 않아 이 영상의 상위 댓글을 한 번에 정리했어요.";

  return {
    ...createBasePayload(input.context.youtubeVideoId, input.context.commentCount, limit),
    status: "ok",
    items,
    fetchedAll,
    fetchedCount: items.length,
    strategy,
    message,
  };
};

export const getYoutubeReactionCommentReplies = async (input: {
  apiKey: string;
  commentId: string;
  context: ReactionTranslationContext;
  env: TranslationEnv;
}): Promise<ReactionCommentRepliesPayload> => {
  const payload = await fetchCommentReplies(input.apiKey, input.commentId);
  const rawReplies =
    payload.items
      ?.map(mapRawCommentBody)
      .filter((comment): comment is RawCommentBody => comment.text.length > 0) ?? [];

  if (rawReplies.length === 0) {
    return createEmptyRepliesPayload(input.context.youtubeVideoId, input.commentId);
  }

  const items = await Promise.all(
    rawReplies.map((reply) => localizeReplyComment(input.env, input.context, reply)),
  );
  const truncated = Boolean(payload.nextPageToken);

  return {
    ...createBaseRepliesPayload(input.context.youtubeVideoId, input.commentId),
    status: "ok",
    items,
    fetchedCount: items.length,
    message: truncated
      ? "답글이 많아 상위 50개만 먼저 번역해 보여드리고 있어요."
      : "답글을 한국어로 정리했어요.",
  };
};

export {
  YoutubeCommentsUnavailableError,
  createEmptyCommentsPayload,
  createUnavailableCommentsPayload,
  createUnavailableRepliesPayload,
};
