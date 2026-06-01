import type {
  AdminDashboardPayload,
  Category,
  CategoryFilter,
  ContentDetailPayload,
  ContentStatus,
  ContentSummary,
  HomePayload,
  PaginatedResponse,
  ReactionCommentsPayload,
  ReactionListPayload,
  SortOrder,
} from "@awesomekorea/shared";

import { getDevPreviewPayload } from "./dev-preview";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const DEV_PREVIEW_ENABLED =
  import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_PREVIEW === "true";

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
    headers?: Record<string, string>;
    method?: string;
  } = {},
) => {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers: {
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const fallback = "요청을 처리하지 못했습니다.";

      try {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? fallback);
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }

        throw new Error(fallback);
      }
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
  getReactionComments: (youtubeVideoId: string) =>
    request<ReactionCommentsPayload>(
      `/api/reactions/${encodeURIComponent(youtubeVideoId)}/comments`,
    ),
  getReactions: (slug: string, sort: SortOrder, page = 1, limit = 12) =>
    request<ReactionListPayload>(
      `/api/contents/${encodeURIComponent(slug)}/reactions?${buildQuery({
        sort,
        page,
        limit,
      })}`,
    ),
  getAdminDashboard: (token: string | null) =>
    request<AdminDashboardPayload>("/api/admin/dashboard", {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    }),
  saveAdminHomeSettings: (
    token: string | null,
    payload: {
      brandName: string;
      brandTagline: string;
      heroBadge: string;
      heroToolbarCopy: string;
      heroTitle: string;
      heroDescription: string;
    },
  ) =>
    request<{ ok: boolean; settings: AdminDashboardPayload["settings"] }>("/api/admin/settings/home", {
      method: "PUT",
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
      body: payload,
    }),
  createAdminCategory: (
    token: string | null,
    payload: {
      slug: string;
      nameKo: string;
      sortOrder: number;
      isActive: boolean;
    },
  ) =>
    request<{ ok: boolean }>("/api/admin/categories", {
      method: "POST",
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
      body: payload,
    }),
  updateAdminCategory: (
    token: string | null,
    categoryId: number,
    payload: {
      slug: string;
      nameKo: string;
      sortOrder: number;
      isActive: boolean;
    },
  ) =>
    request<{ ok: boolean }>(`/api/admin/categories/${categoryId}`, {
      method: "PUT",
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
      body: payload,
    }),
  createAdminContent: (
    token: string | null,
    payload: {
      categoryId: number;
      slug: string;
      titleKo: string;
      titleEn: string | null;
      aliases: string[];
      releaseYear: number | null;
      thumbnailUrl: string | null;
      description: string | null;
      status: ContentStatus;
    },
  ) =>
    request<{ ok: boolean }>("/api/admin/contents", {
      method: "POST",
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
      body: payload,
    }),
  updateAdminContent: (
    token: string | null,
    contentId: number,
    payload: {
      categoryId: number;
      slug: string;
      titleKo: string;
      titleEn: string | null;
      aliases: string[];
      releaseYear: number | null;
      thumbnailUrl: string | null;
      description: string | null;
      status: ContentStatus;
    },
  ) =>
    request<{ ok: boolean }>(`/api/admin/contents/${contentId}`, {
      method: "PUT",
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
      body: payload,
    }),
  updateAdminReaction: (
    token: string | null,
    youtubeVideoId: string,
    payload: {
      adminTitle: string | null;
      adminDescription: string | null;
      isFeatured: boolean;
      featuredOrder: number;
    },
  ) =>
    request<{ ok: boolean }>(`/api/admin/reactions/${encodeURIComponent(youtubeVideoId)}`, {
      method: "PUT",
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
      body: payload,
    }),
};
