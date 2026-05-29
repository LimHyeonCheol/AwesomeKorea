import type {
  Category,
  CategoryFilter,
  ContentDetailPayload,
  ContentSummary,
  HomePayload,
  PaginatedResponse,
  ReactionListPayload,
  SortOrder,
} from "@awesomekorea/shared";

import { getDevPreviewPayload } from "./dev-preview";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

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

const request = async <T>(path: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`);

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
    if (import.meta.env.DEV) {
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
  getReactions: (slug: string, sort: SortOrder, page = 1, limit = 12) =>
    request<ReactionListPayload>(
      `/api/contents/${encodeURIComponent(slug)}/reactions?${buildQuery({
        sort,
        page,
        limit,
      })}`,
    ),
};
