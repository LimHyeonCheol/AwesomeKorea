import type {
  AdminContentDetailPayload,
  AdminDashboardPayload,
  AdminProfile,
  AdminSessionPayload,
  Category,
  CategoryFilter,
  ContentDetailPayload,
  ContentStatus,
  ContentSummary,
  HomePayload,
  PaginatedResponse,
  ReactionCommentRepliesPayload,
  ReactionCommentsPayload,
  ReactionListPayload,
  SortOrder,
} from "@awesomekorea/shared";

import { getDevPreviewPayload } from "./dev-preview";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const DEV_PREVIEW_ENABLED =
  import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_PREVIEW === "true";
const ADMIN_API_TIMEOUT_MS = 8_000;
const ADMIN_MUTATION_TIMEOUT_MS = 12_000;
const DEFAULT_REQUEST_ERROR_MESSAGE = "요청을 처리하지 못했습니다.";

export class ApiRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

export class ApiTimeoutError extends Error {
  path: string;
  timeoutMs: number;

  constructor(path: string, timeoutMs: number) {
    super(
      `서버가 ${Math.max(1, Math.round(timeoutMs / 1000))}초 안에 응답하지 않았습니다. 로컬 API 서버가 실행 중인지 확인한 뒤 다시 시도해 주세요.`,
    );
    this.name = "ApiTimeoutError";
    this.path = path;
    this.timeoutMs = timeoutMs;
  }
}

export const isApiRequestError = (error: unknown, status?: number): error is ApiRequestError =>
  error instanceof ApiRequestError && (status === undefined || error.status === status);

export const isApiTimeoutError = (error: unknown): error is ApiTimeoutError =>
  error instanceof ApiTimeoutError;

const buildQuery = (params: Record<string, string | number | undefined>) => {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }

    searchParams.set(key, String(value));
  }

  return searchParams.toString();
};

const request = async <T>(
  path: string,
  options: {
    body?: unknown;
    credentials?: RequestCredentials;
    headers?: Record<string, string>;
    method?: string;
    timeoutMs?: number;
  } = {},
) => {
  const timeoutMs = options.timeoutMs;
  const controller = timeoutMs ? new AbortController() : null;
  const timeoutHandle = timeoutMs
    ? globalThis.setTimeout(() => {
        controller?.abort();
      }, timeoutMs)
    : null;

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      credentials: options.credentials ?? "same-origin",
      signal: controller?.signal,
      headers: {
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      let message = DEFAULT_REQUEST_ERROR_MESSAGE;

      try {
        const payload = (await response.json()) as { message?: string };
        message = payload.message ?? DEFAULT_REQUEST_ERROR_MESSAGE;
      } catch {
        message = DEFAULT_REQUEST_ERROR_MESSAGE;
      }

      throw new ApiRequestError(response.status, message);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (DEV_PREVIEW_ENABLED) {
      const previewPayload = getDevPreviewPayload(path);

      if (previewPayload) {
        return previewPayload as T;
      }
    }

    if (error instanceof Error && error.name === "AbortError" && timeoutMs) {
      throw new ApiTimeoutError(path, timeoutMs);
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error(DEFAULT_REQUEST_ERROR_MESSAGE);
  } finally {
    if (timeoutHandle) {
      globalThis.clearTimeout(timeoutHandle);
    }
  }
};

export const apiClient = {
  getCategories: () => request<{ items: Category[] }>("/api/categories"),
  getContentDetail: (slug: string) =>
    request<ContentDetailPayload>(`/api/contents/${encodeURIComponent(slug)}`),
  getContents: (options: {
    category: CategoryFilter;
    limit?: number;
    page?: number;
    sort: SortOrder;
  }) =>
    request<PaginatedResponse<ContentSummary>>(
      `/api/contents?${buildQuery({
        category: options.category === "all" ? undefined : options.category,
        sort: options.sort,
        page: options.page ?? 1,
        limit: options.limit ?? 8,
      })}`,
    ),
  getHome: () => request<HomePayload>("/api/home"),
  getReactionComments: (youtubeVideoId: string, limit = 20) =>
    request<ReactionCommentsPayload>(
      `/api/reactions/${encodeURIComponent(youtubeVideoId)}/comments?${buildQuery({
        limit,
      })}`,
    ),
  getReactionCommentReplies: (youtubeVideoId: string, commentId: string) =>
    request<ReactionCommentRepliesPayload>(
      `/api/reactions/${encodeURIComponent(youtubeVideoId)}/comments/${encodeURIComponent(commentId)}/replies`,
    ),
  getReactions: (slug: string, sort: SortOrder, page = 1, limit = 12) =>
    request<ReactionListPayload>(
      `/api/contents/${encodeURIComponent(slug)}/reactions?${buildQuery({
        sort,
        page,
        limit,
      })}`,
    ),
  getAdminDashboard: () =>
    request<AdminDashboardPayload>("/api/admin/dashboard", {
      credentials: "include",
      timeoutMs: ADMIN_API_TIMEOUT_MS,
    }),
  getAdminContentDetail: (contentId: number) =>
    request<AdminContentDetailPayload>(`/api/admin/contents/${contentId}`, {
      credentials: "include",
      timeoutMs: ADMIN_API_TIMEOUT_MS,
    }),
  getAdminSession: () =>
    request<AdminSessionPayload>("/api/admin/me", {
      credentials: "include",
      timeoutMs: ADMIN_API_TIMEOUT_MS,
    }),
  loginAdmin: (payload: { loginId: string; password: string }) =>
    request<AdminSessionPayload>("/api/admin/login", {
      method: "POST",
      credentials: "include",
      body: payload,
      timeoutMs: ADMIN_API_TIMEOUT_MS,
    }),
  logoutAdmin: () =>
    request<{ ok: boolean }>("/api/admin/logout", {
      method: "POST",
      credentials: "include",
      timeoutMs: ADMIN_API_TIMEOUT_MS,
    }),
  createAdminCategory: (payload: {
    slug: string;
    nameKo: string;
    sortOrder: number;
    isActive: boolean;
  }) =>
    request<{ id: number; ok: boolean }>("/api/admin/categories", {
      method: "POST",
      credentials: "include",
      body: payload,
      timeoutMs: ADMIN_MUTATION_TIMEOUT_MS,
    }),
  updateAdminCategory: (
    categoryId: number,
    payload: {
      slug: string;
      nameKo: string;
      sortOrder: number;
      isActive: boolean;
    },
  ) =>
    request<{ id: number; ok: boolean }>(`/api/admin/categories/${categoryId}`, {
      method: "PUT",
      credentials: "include",
      body: payload,
      timeoutMs: ADMIN_MUTATION_TIMEOUT_MS,
    }),
  deleteAdminCategory: (categoryId: number) =>
    request<{ id: number; ok: boolean }>(`/api/admin/categories/${categoryId}`, {
      method: "DELETE",
      credentials: "include",
      timeoutMs: ADMIN_MUTATION_TIMEOUT_MS,
    }),
  createAdminContent: (payload: {
    categoryId: number;
    slug: string;
    titleKo: string;
    titleEn: string | null;
    releaseYear: number | null;
    releaseDate: string | null;
    status: ContentStatus;
  }) =>
    request<{ id: number; ok: boolean }>("/api/admin/contents", {
      method: "POST",
      credentials: "include",
      body: payload,
      timeoutMs: ADMIN_MUTATION_TIMEOUT_MS,
    }),
  updateAdminContent: (
    contentId: number,
    payload: {
      categoryId: number;
      slug: string;
      titleKo: string;
      titleEn: string | null;
      aliases: string[];
      releaseYear: number | null;
      releaseDate: string | null;
      thumbnailUrl: string | null;
      description: string | null;
      searchKeywords: string[];
      priorityScore: number;
      heroMessageKo: string | null;
      status: ContentStatus;
    },
  ) =>
    request<{ id: number; ok: boolean }>(`/api/admin/contents/${contentId}`, {
      method: "PUT",
      credentials: "include",
      body: payload,
      timeoutMs: ADMIN_MUTATION_TIMEOUT_MS,
    }),
  deleteAdminContent: (contentId: number) =>
    request<{ id: number; ok: boolean }>(`/api/admin/contents/${contentId}`, {
      method: "DELETE",
      credentials: "include",
      timeoutMs: ADMIN_MUTATION_TIMEOUT_MS,
    }),
};

export type { AdminProfile };
