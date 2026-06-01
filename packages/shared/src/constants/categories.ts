export const MVP_CATEGORIES = [
  {
    slug: "movie",
    nameKo: "영화",
    sortOrder: 1,
    isActive: true,
  },
  {
    slug: "drama",
    nameKo: "드라마",
    sortOrder: 2,
    isActive: true,
  },
  {
    slug: "webtoon",
    nameKo: "만화",
    sortOrder: 3,
    isActive: true,
  },
  {
    slug: "music",
    nameKo: "노래",
    sortOrder: 4,
    isActive: true,
  },
] as const;

export type CategorySlug = string;

export const CATEGORY_NAME_BY_SLUG: Record<string, string> = {
  movie: "영화",
  drama: "드라마",
  webtoon: "만화",
  music: "노래",
};
