import type {
  AdminDashboardPayload,
  AdminProfile,
  AdminContentDetailPayload,
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

export class ApiRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

export const isApiRequestError = (error: unknown, status?: number): error is ApiRequestError =>
  error instanceof ApiRequestError && (status === undefined || error.status === status);

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
  } = {},
) => {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      credentials: options.credentials ?? "same-origin",
      headers: {
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const fallback = "요청을 처리하지 못했습니다.";
      let message = fallback;

      try {
        const payload = (await response.json()) as { message?: string };
        message = payload.message ?? fallback;
      } catch {
        message = fallback;
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

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("요청을 처리하지 못했습니다.");
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
    }),
  getAdminContentDetail: (contentId: number) =>
    request<AdminContentDetailPayload>(`/api/admin/contents/${contentId}`, {
      credentials: "include",
    }),
  getAdminSession: () =>
    request<AdminSessionPayload>("/api/admin/me", {
      credentials: "include",
    }),
  loginAdmin: (payload: { loginId: string; password: string }) =>
    request<AdminSessionPayload>("/api/admin/login", {
      method: "POST",
      credentials: "include",
      body: payload,
    }),
  logoutAdmin: () =>
    request<{ ok: boolean }>("/api/admin/logout", {
      method: "POST",
      credentials: "include",
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
    }),
  deleteAdminCategory: (categoryId: number) =>
    request<{ id: number; ok: boolean }>(`/api/admin/categories/${categoryId}`, {
      method: "DELETE",
      credentials: "include",
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
    }),
  deleteAdminContent: (contentId: number) =>
    request<{ id: number; ok: boolean }>(`/api/admin/contents/${contentId}`, {
      method: "DELETE",
      credentials: "include",
    }),
  updateAdminReaction: (
    youtubeVideoId: string,
    payload: {
      adminTitle: string | null;
      adminDescription: string | null;
      isFeatured: boolean;
      featuredOrder: number;
    },
  ) =>
    request<{ ok: boolean; youtubeVideoId: string }>(
      `/api/admin/reactions/${encodeURIComponent(youtubeVideoId)}`,
      {
        method: "PUT",
        credentials: "include",
        body: payload,
      },
    ),
};

export type { AdminProfile };
