import type { ReactionComment, ReactionCommentsPayload } from "@awesomekorea/shared";

const YOUTUBE_COMMENT_API_URL = "https://www.googleapis.com/youtube/v3/commentThreads";
const COMMENT_PAGE_SIZE = 50;
const FULL_FETCH_THRESHOLD = 50;

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
  replies?: {
    comments?: YoutubeCommentResource[];
  };
}

interface YoutubeCommentThreadsResponse {
  items?: YoutubeCommentThread[];
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

class YoutubeCommentsUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "YoutubeCommentsUnavailableError";
  }
}

const createBasePayload = (
  videoId: string,
  totalCommentCount: number,
): Omit<ReactionCommentsPayload, "status" | "items" | "fetchedAll" | "fetchedCount" | "message"> => ({
  videoId,
  order: "relevance",
  strategy: totalCommentCount > FULL_FETCH_THRESHOLD ? "top50" : "full",
  pageSize: COMMENT_PAGE_SIZE,
  totalCommentCount,
  estimatedQuotaUnits: totalCommentCount > 0 ? 1 : 0,
});

export const createUnavailableCommentsPayload = (
  videoId: string,
  totalCommentCount: number,
  message: string,
): ReactionCommentsPayload => ({
  ...createBasePayload(videoId, totalCommentCount),
  status: "unavailable",
  items: [],
  fetchedAll: false,
  fetchedCount: 0,
  message,
});

const createDisabledCommentsPayload = (
  videoId: string,
  totalCommentCount: number,
): ReactionCommentsPayload => ({
  ...createBasePayload(videoId, totalCommentCount),
  status: "disabled",
  items: [],
  fetchedAll: false,
  fetchedCount: 0,
  message: "이 영상은 유튜브에서 댓글 공개가 꺼져 있어 댓글을 불러올 수 없어요.",
});

export const createEmptyCommentsPayload = (
  videoId: string,
  totalCommentCount: number,
): ReactionCommentsPayload => ({
  ...createBasePayload(videoId, totalCommentCount),
  status: "empty",
  items: [],
  fetchedAll: true,
  fetchedCount: 0,
  message: "아직 표시할 댓글이 없어요.",
});

const mapCommentResource = (comment: YoutubeCommentResource): ReactionComment => ({
  id: comment.id ?? crypto.randomUUID(),
  authorDisplayName: comment.snippet?.authorDisplayName?.trim() || "익명 시청자",
  authorProfileImageUrl: comment.snippet?.authorProfileImageUrl?.trim() || null,
  text: comment.snippet?.textDisplay?.trim() || comment.snippet?.textOriginal?.trim() || "",
  likeCount: comment.snippet?.likeCount ?? 0,
  publishedAt: comment.snippet?.publishedAt ?? new Date(0).toISOString(),
  updatedAt: comment.snippet?.updatedAt ?? comment.snippet?.publishedAt ?? new Date(0).toISOString(),
  replyCount: 0,
  replies: [],
});

const mapThreadToComment = (thread: YoutubeCommentThread): ReactionComment | null => {
  const topLevelComment = thread.snippet?.topLevelComment;

  if (!topLevelComment) {
    return null;
  }

  const comment = mapCommentResource(topLevelComment);

  return {
    ...comment,
    id: thread.id ?? comment.id,
    replyCount: thread.snippet?.totalReplyCount ?? 0,
    replies:
      thread.replies?.comments?.map((reply) => {
        const mappedReply = mapCommentResource(reply);

        return {
          id: mappedReply.id,
          authorDisplayName: mappedReply.authorDisplayName,
          authorProfileImageUrl: mappedReply.authorProfileImageUrl,
          text: mappedReply.text,
          likeCount: mappedReply.likeCount,
          publishedAt: mappedReply.publishedAt,
        };
      }) ?? [],
  };
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

const fetchCommentThreads = async (apiKey: string, videoId: string) => {
  const url = new URL(YOUTUBE_COMMENT_API_URL);

  url.searchParams.set("part", "snippet,replies");
  url.searchParams.set("videoId", videoId);
  url.searchParams.set("maxResults", String(COMMENT_PAGE_SIZE));
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

export const getYoutubeReactionComments = async (input: {
  apiKey: string;
  totalCommentCount: number;
  videoId: string;
}): Promise<ReactionCommentsPayload> => {
  if (input.totalCommentCount <= 0) {
    return createEmptyCommentsPayload(input.videoId, input.totalCommentCount);
  }

  const response = await fetchCommentThreads(input.apiKey, input.videoId);

  if (response.disabled) {
    return createDisabledCommentsPayload(input.videoId, input.totalCommentCount);
  }

  const comments =
    response.payload?.items
      ?.map(mapThreadToComment)
      .filter((comment): comment is ReactionComment => comment !== null && comment.text.length > 0) ?? [];

  if (comments.length === 0) {
    return createEmptyCommentsPayload(input.videoId, input.totalCommentCount);
  }

  const fetchedAll =
    input.totalCommentCount <= FULL_FETCH_THRESHOLD && !response.payload?.nextPageToken;
  const strategy = input.totalCommentCount > FULL_FETCH_THRESHOLD ? "top50" : "full";
  const message =
    strategy === "top50"
      ? "댓글 1개마다 quota가 차감되는 구조는 아니지만, 페이지 요청마다 quota 1이 소모돼 인기 댓글 50개만 먼저 보여드려요."
      : "댓글 수가 많지 않아 이 영상의 댓글을 한 번에 함께 보여드려요.";

  return {
    ...createBasePayload(input.videoId, input.totalCommentCount),
    status: "ok",
    items: comments,
    fetchedAll,
    fetchedCount: comments.length,
    strategy,
    message,
  };
};

export { YoutubeCommentsUnavailableError };
