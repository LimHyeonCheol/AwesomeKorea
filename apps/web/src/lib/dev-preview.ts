import type {
  Category,
  ContentDetailPayload,
  ContentSummary,
  HomePayload,
  PaginatedResponse,
  ReactionListPayload,
  ReactionVideo,
} from "@awesomekorea/shared";

const previewCategories: Category[] = [
  { id: 1, slug: "movie", nameKo: "영화", sortOrder: 1, isActive: true },
  { id: 2, slug: "drama", nameKo: "드라마", sortOrder: 2, isActive: true },
  { id: 3, slug: "webtoon", nameKo: "만화", sortOrder: 3, isActive: true },
  { id: 4, slug: "music", nameKo: "노래", sortOrder: 4, isActive: true },
];

type PreviewContent = ContentSummary & {
  aliases: string[];
};

const previewContents: PreviewContent[] = [
  {
    id: 1,
    slug: "extreme-job",
    titleKo: "극한직업",
    titleEn: "Extreme Job",
    categorySlug: "movie",
    categoryNameKo: "영화",
    releaseYear: 2019,
    thumbnailUrl: null,
    description: "해외 유튜브에서 반응이 빠르게 늘고 있는 코미디 영화",
    reactionCount: 47,
    totalViews: 2100000,
    latestReactionAt: "2026-05-30T00:00:00.000Z",
    aliases: ["Extreme Job", "극한직업 reaction", "Korean comedy movie"],
  },
  {
    id: 2,
    slug: "new-journey-to-the-west",
    titleKo: "신서유기",
    titleEn: "New Journey to the West",
    categorySlug: "drama",
    categoryNameKo: "드라마",
    releaseYear: 2015,
    thumbnailUrl: null,
    description: "예능성 포인트를 좋아하는 해외 채널 반응이 빠른 콘텐츠",
    reactionCount: 33,
    totalViews: 1800000,
    latestReactionAt: "2026-05-30T02:00:00.000Z",
    aliases: ["신서유기 reaction", "New Journey to the West"],
  },
  {
    id: 3,
    slug: "apt",
    titleKo: "APT.",
    titleEn: "APT.",
    categorySlug: "music",
    categoryNameKo: "노래",
    releaseYear: 2024,
    thumbnailUrl: null,
    description: "뮤직비디오와 라이브 클립 기반 리액션이 많은 대표 트랙",
    reactionCount: 91,
    totalViews: 5400000,
    latestReactionAt: "2026-05-30T05:00:00.000Z",
    aliases: ["APT reaction", "Rose Bruno Mars APT"],
  },
  {
    id: 4,
    slug: "solo-leveling",
    titleKo: "나 혼자만 레벨업",
    titleEn: "Solo Leveling",
    categorySlug: "webtoon",
    categoryNameKo: "만화",
    releaseYear: 2018,
    thumbnailUrl: null,
    description: "애니화 이후 해외 리액션 수집 가치가 높은 대표 IP",
    reactionCount: 28,
    totalViews: 1600000,
    latestReactionAt: "2026-05-29T23:45:00.000Z",
    aliases: ["Solo Leveling reaction", "나 혼자만 레벨업"],
  },
  {
    id: 5,
    slug: "parasite",
    titleKo: "기생충",
    titleEn: "Parasite",
    categorySlug: "movie",
    categoryNameKo: "영화",
    releaseYear: 2019,
    thumbnailUrl: null,
    description: "분석형 리뷰와 첫 감상 영상이 꾸준히 쌓이는 작품",
    reactionCount: 62,
    totalViews: 3200000,
    latestReactionAt: "2026-05-29T18:30:00.000Z",
    aliases: ["Parasite reaction", "기생충 review"],
  },
  {
    id: 6,
    slug: "squid-game-2",
    titleKo: "오징어게임 S2",
    titleEn: "Squid Game Season 2",
    categorySlug: "drama",
    categoryNameKo: "드라마",
    releaseYear: 2026,
    thumbnailUrl: null,
    description: "최신순과 인기순 모두 강한 글로벌 반응 콘텐츠",
    reactionCount: 110,
    totalViews: 6100000,
    latestReactionAt: "2026-05-30T04:10:00.000Z",
    aliases: ["Squid Game Season 2 reaction", "오징어게임 시즌2"],
  },
  {
    id: 7,
    slug: "guardian",
    titleKo: "도깨비",
    titleEn: "Guardian",
    categorySlug: "drama",
    categoryNameKo: "드라마",
    releaseYear: 2016,
    thumbnailUrl: null,
    description: "클래식 드라마 리액션 확보용 기준 콘텐츠",
    reactionCount: 38,
    totalViews: 2900000,
    latestReactionAt: "2026-05-29T08:10:00.000Z",
    aliases: ["Goblin reaction", "도깨비 reaction"],
  },
  {
    id: 8,
    slug: "bokmyeon-song",
    titleKo: "복면가왕 레전드 무대",
    titleEn: "King of Mask Singer Highlights",
    categorySlug: "music",
    categoryNameKo: "노래",
    releaseYear: 2025,
    thumbnailUrl: null,
    description: "예능형 음악 반응을 담기 위한 시드 카드",
    reactionCount: 22,
    totalViews: 1200000,
    latestReactionAt: "2026-05-29T12:00:00.000Z",
    aliases: ["King of Mask Singer reaction", "복면가왕 reaction"],
  },
];

const createReaction = (
  id: number,
  youtubeVideoId: string,
  title: string,
  publishedAt: string,
  viewCount: number,
  channelName: string,
): ReactionVideo => ({
  id,
  youtubeVideoId,
  title,
  thumbnailUrl: null,
  publishedAt,
  viewCount,
  likeCount: Math.floor(viewCount / 16),
  commentCount: Math.floor(viewCount / 180),
  youtubeUrl: `https://www.youtube.com/watch?v=${youtubeVideoId}`,
  embedUrl: `https://www.youtube.com/embed/${youtubeVideoId}`,
  channelName,
});

const previewReactions: Record<string, ReactionVideo[]> = {
  "extreme-job": [
    createReaction(
      1,
      "react-001",
      "극한직업 보고 충격받은 미국인 반응",
      "2026-05-30T00:00:00.000Z",
      312000,
      "ReactKing",
    ),
    createReaction(
      2,
      "react-002",
      "Americans watch Extreme Job for the first time",
      "2026-05-29T20:00:00.000Z",
      208000,
      "FilmReact",
    ),
    createReaction(
      3,
      "react-003",
      "이 영화 진짜임? | 극한직업 리액션",
      "2026-05-29T12:30:00.000Z",
      177000,
      "WatchKorea",
    ),
  ],
  "squid-game-2": [
    createReaction(
      4,
      "react-008",
      "Squid Game Season 2 trailer reaction",
      "2026-05-30T04:10:00.000Z",
      620000,
      "ReactKing",
    ),
    createReaction(
      5,
      "react-013",
      "Everyone is talking about Squid Game Season 2",
      "2026-05-30T03:30:00.000Z",
      310000,
      "DramaScope",
    ),
  ],
  apt: [
    createReaction(
      6,
      "react-005",
      "APT. MV reaction and vocal breakdown",
      "2026-05-30T05:00:00.000Z",
      540000,
      "Kpop Room",
    ),
  ],
};

for (const content of previewContents) {
  if (!previewReactions[content.slug]) {
    previewReactions[content.slug] = [
      createReaction(
        1000 + content.id,
        `${content.slug}-featured`,
        `${content.titleKo} 대표 리액션`,
        content.latestReactionAt ?? "2026-05-29T00:00:00.000Z",
        Math.max(Math.floor(content.totalViews / Math.max(content.reactionCount, 1)), 10000),
        "GlobalReact",
      ),
    ];
  }
}

const previewTop10: HomePayload["top10"] = [
  { rank: 1, contentSlug: "extreme-job", titleKo: "극한직업", categorySlug: "movie", categoryNameKo: "영화", reactionCount: 47, totalViews: 2100000, thumbnailUrl: null },
  { rank: 2, contentSlug: "new-journey-to-the-west", titleKo: "신서유기", categorySlug: "drama", categoryNameKo: "드라마", reactionCount: 33, totalViews: 1800000, thumbnailUrl: null },
  { rank: 3, contentSlug: "apt", titleKo: "APT.", categorySlug: "music", categoryNameKo: "노래", reactionCount: 91, totalViews: 5400000, thumbnailUrl: null },
  { rank: 4, contentSlug: "solo-leveling", titleKo: "나 혼자만 레벨업", categorySlug: "webtoon", categoryNameKo: "만화", reactionCount: 28, totalViews: 1600000, thumbnailUrl: null },
  { rank: 5, contentSlug: "parasite", titleKo: "기생충", categorySlug: "movie", categoryNameKo: "영화", reactionCount: 62, totalViews: 3200000, thumbnailUrl: null },
  { rank: 6, contentSlug: "squid-game-2", titleKo: "오징어게임 S2", categorySlug: "drama", categoryNameKo: "드라마", reactionCount: 110, totalViews: 6100000, thumbnailUrl: null },
  { rank: 7, contentSlug: "guardian", titleKo: "도깨비", categorySlug: "drama", categoryNameKo: "드라마", reactionCount: 38, totalViews: 2900000, thumbnailUrl: null },
  { rank: 8, contentSlug: "bokmyeon-song", titleKo: "복면가왕 레전드 무대", categorySlug: "music", categoryNameKo: "노래", reactionCount: 22, totalViews: 1200000, thumbnailUrl: null },
];

const previewHome: HomePayload = {
  hero: {
    contentSlug: "extreme-job",
    titleKo: "극한직업",
    categoryNameKo: "영화",
    reactionCount: 47,
    message: "오늘 가장 많이 본 반응 콘텐츠",
  },
  top10: previewTop10,
  popularByCategory: [
    {
      categorySlug: "all",
      categoryNameKo: "전체",
      items: previewContents.slice(0, 8),
    },
    {
      categorySlug: "movie",
      categoryNameKo: "영화",
      items: previewContents.filter((item) => item.categorySlug === "movie"),
    },
    {
      categorySlug: "drama",
      categoryNameKo: "드라마",
      items: previewContents.filter((item) => item.categorySlug === "drama"),
    },
    {
      categorySlug: "webtoon",
      categoryNameKo: "만화",
      items: previewContents.filter((item) => item.categorySlug === "webtoon"),
    },
    {
      categorySlug: "music",
      categoryNameKo: "노래",
      items: previewContents.filter((item) => item.categorySlug === "music"),
    },
  ],
  updatedAt: "2026-05-30T08:00:00.000Z",
};

const sortContents = (items: ContentSummary[], sort: "popular" | "latest") =>
  [...items].sort((left, right) => {
    if (sort === "latest") {
      return (
        String(right.latestReactionAt).localeCompare(String(left.latestReactionAt)) ||
        right.totalViews - left.totalViews
      );
    }

    return right.totalViews - left.totalViews || right.reactionCount - left.reactionCount;
  });

const sortReactions = (items: ReactionVideo[], sort: "popular" | "latest") =>
  [...items].sort((left, right) => {
    if (sort === "latest") {
      return (
        String(right.publishedAt).localeCompare(String(left.publishedAt)) ||
        right.viewCount - left.viewCount
      );
    }

    return (
      right.viewCount - left.viewCount ||
      String(right.publishedAt).localeCompare(String(left.publishedAt))
    );
  });

const asPaginated = <T>(items: T[], page: number, limit: number): PaginatedResponse<T> => ({
  items: items.slice((page - 1) * limit, page * limit),
  page,
  limit,
  total: items.length,
  totalPages: Math.max(1, Math.ceil(items.length / limit)),
});

export const getDevPreviewPayload = (requestPath: string) => {
  const url = new URL(requestPath, "http://localhost");

  if (url.pathname === "/api/categories") {
    return {
      items: previewCategories,
    };
  }

  if (url.pathname === "/api/home") {
    return previewHome;
  }

  if (url.pathname === "/api/contents") {
    const category = url.searchParams.get("category");
    const sort = url.searchParams.get("sort") === "latest" ? "latest" : "popular";
    const page = Number(url.searchParams.get("page") ?? "1");
    const limit = Number(url.searchParams.get("limit") ?? "8");
    const filtered = previewContents.filter((item) => !category || item.categorySlug === category);
    return asPaginated(sortContents(filtered, sort), page, limit);
  }

  const detailMatch = url.pathname.match(/^\/api\/contents\/([^/]+)$/);

  if (detailMatch) {
    const rawSlug = detailMatch[1];

    if (!rawSlug) {
      return null;
    }

    const slug = decodeURIComponent(rawSlug);
    const content = previewContents.find((item) => item.slug === slug);

    if (!content) {
      return null;
    }

    const payload: ContentDetailPayload = {
      content,
      featuredReaction: previewReactions[slug]?.[0] ?? null,
      availableSorts: ["popular", "latest"],
    };

    return payload;
  }

  const reactionMatch = url.pathname.match(/^\/api\/contents\/([^/]+)\/reactions$/);

  if (reactionMatch) {
    const rawSlug = reactionMatch[1];

    if (!rawSlug) {
      return null;
    }

    const slug = decodeURIComponent(rawSlug);
    const content = previewContents.find((item) => item.slug === slug);

    if (!content) {
      return null;
    }

    const sort = url.searchParams.get("sort") === "latest" ? "latest" : "popular";
    const items = sortReactions(previewReactions[slug] ?? [], sort);
    const page = Number(url.searchParams.get("page") ?? "1");
    const limit = Number(url.searchParams.get("limit") ?? "12");
    const paginated = asPaginated(items, page, limit);
    const payload: ReactionListPayload = {
      content: {
        slug: content.slug,
        titleKo: content.titleKo,
        categoryNameKo: content.categoryNameKo,
      },
      featuredReaction: items[0] ?? null,
      sort,
      ...paginated,
    };

    return payload;
  }

  return null;
};
