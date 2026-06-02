export const MVP_CATEGORIES = [
  {
    slug: "movie",
    nameKo: "\uC601\uD654",
    sortOrder: 1,
    isActive: true,
  },
  {
    slug: "drama",
    nameKo: "\uB4DC\uB77C\uB9C8",
    sortOrder: 2,
    isActive: true,
  },
  {
    slug: "webtoon",
    nameKo: "\uC6F9\uD230",
    sortOrder: 3,
    isActive: true,
  },
  {
    slug: "music",
    nameKo: "\uC74C\uC545",
    sortOrder: 4,
    isActive: true,
  },
  {
    slug: "game",
    nameKo: "\uAC8C\uC784",
    sortOrder: 5,
    isActive: true,
  },
] as const;

export type CategorySlug = (typeof MVP_CATEGORIES)[number]["slug"];

export const CATEGORY_NAME_BY_SLUG: Record<CategorySlug, string> = {
  movie: "\uC601\uD654",
  drama: "\uB4DC\uB77C\uB9C8",
  webtoon: "\uC6F9\uD230",
  music: "\uC74C\uC545",
  game: "\uAC8C\uC784",
};
