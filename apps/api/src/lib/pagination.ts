import type { PaginatedResponse, SortOrder } from "@awesomekorea/shared";

export const clampLimit = (value: string | undefined, fallback = 12, max = 50) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(Math.floor(parsed), max);
};

export const clampPage = (value: string | undefined, fallback = 1) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
};

export const parseSort = (value: string | undefined): SortOrder => {
  if (value === "latest") {
    return "latest";
  }

  return "popular";
};

export const toPaginatedResponse = <T>(
  items: T[],
  page: number,
  limit: number,
  total: number,
): PaginatedResponse<T> => ({
  items,
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});
