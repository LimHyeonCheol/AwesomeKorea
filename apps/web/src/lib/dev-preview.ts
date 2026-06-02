import type {
  Category,
  ContentDetail,
  ContentDetailPayload,
  ContentSummary,
  HomePayload,
  PaginatedResponse,
  ReactionCommentRepliesPayload,
  ReactionCommentsPayload,
  ReactionListPayload,
  ReactionVideo,
} from "@awesomekorea/shared";

const previewCategories: Category[] = [
  { id: 1, slug: "movie", nameKo: "영화", sortOrder: 1, isActive: true },
  { id: 2, slug: "drama", nameKo: "드라마", sortOrder: 2, isActive: true },
  { id: 3, slug: "webtoon", nameKo: "웹툰", sortOrder: 3, isActive: true },
  { id: 4, slug: "music", nameKo: "음악", sortOrder: 4, isActive: true },
  { id: 5, slug: "game", nameKo: "게임", sortOrder: 5, isActive: true },
];

type PreviewContent = ContentDetail;

const createContent = (content: PreviewContent) => content;

const previewContents: PreviewContent[] = [
  createContent({
    id: 1,
    slug: "extreme-job",
    titleKo: "극한직업",
    titleEn: "Extreme Job",
    categorySlug: "movie",
    categoryNameKo: "영화",
    releaseYear: 2019,
    releaseDate: "2019-01-23",
    thumbnailUrl: null,
    description: "해외 반응이 꾸준히 이어지는 한국 코미디 영화입니다.",
    heroMessageKo: "웃음과 액션 템포가 빨라 해외 리액션 몰입도가 높은 작품입니다.",
    priorityScore: 30,
    isEditorialPick: false,
    reactionCount: 47,
    totalViews: 2100000,
    latestReactionAt: "2026-05-30T00:00:00.000Z",
    aliases: ["Extreme Job", "극한직업 reaction"],
    searchKeywords: ["Extreme Job reaction", "\"Extreme Job\" first time watching"],
  }),
  createContent({
    id: 2,
    slug: "squid-game-2",
    titleKo: "오징어 게임 시즌 2",
    titleEn: "Squid Game Season 2",
    categorySlug: "drama",
    categoryNameKo: "드라마",
    releaseYear: 2026,
    releaseDate: "2026-12",
    thumbnailUrl: null,
    description: "트레일러 공개 직후 글로벌 반응이 크게 모이는 대표 드라마입니다.",
    heroMessageKo: "신작 기대감이 높아 홈 추천 영역에서 주목도가 좋은 작품입니다.",
    priorityScore: 60,
    isEditorialPick: true,
    reactionCount: 110,
    totalViews: 6100000,
    latestReactionAt: "2026-05-30T04:10:00.000Z",
    aliases: ["Squid Game Season 2", "오징어 게임 시즌 2"],
    searchKeywords: ["\"Squid Game Season 2\" reaction", "\"Squid Game Season 2\" trailer reaction"],
  }),
  createContent({
    id: 3,
    slug: "apt",
    titleKo: "APT.",
    titleEn: "APT.",
    categorySlug: "music",
    categoryNameKo: "음악",
    releaseYear: 2024,
    releaseDate: "2024-10-18",
    thumbnailUrl: null,
    description: "뮤직비디오와 라이브 퍼포먼스 반응이 빠르게 쌓이는 곡입니다.",
    heroMessageKo: "보컬 분석과 퍼포먼스 반응이 함께 잘 모이는 음악 카테고리 대표 사례입니다.",
    priorityScore: 25,
    isEditorialPick: false,
    reactionCount: 91,
    totalViews: 5400000,
    latestReactionAt: "2026-05-30T05:00:00.000Z",
    aliases: ["APT reaction", "Rose Bruno Mars APT"],
    searchKeywords: ["\"APT\" reaction song", "\"APT\" vocal breakdown"],
  }),
  createContent({
    id: 4,
    slug: "solo-leveling",
    titleKo: "나 혼자만 레벨업",
    titleEn: "Solo Leveling",
    categorySlug: "webtoon",
    categoryNameKo: "웹툰",
    releaseYear: 2018,
    releaseDate: "2018-03",
    thumbnailUrl: null,
    description: "웹툰과 애니메이션 양쪽에서 반응을 끌어오는 대표 IP입니다.",
    heroMessageKo: "해외 팬덤이 넓어 시즌 이슈마다 꾸준히 신규 반응이 유입됩니다.",
    priorityScore: 35,
    isEditorialPick: false,
    reactionCount: 28,
    totalViews: 1600000,
    latestReactionAt: "2026-05-29T23:45:00.000Z",
    aliases: ["Solo Leveling", "나 혼자만 레벨업"],
    searchKeywords: ["\"Solo Leveling\" reaction webtoon", "\"Solo Leveling\" episode 1 reaction"],
  }),
  createContent({
    id: 5,
    slug: "call-of-duty-modern-warfare-4",
    titleKo: "콜 오브 듀티: 모던 워페어 4",
    titleEn: "Call of Duty: Modern Warfare 4",
    categorySlug: "game",
    categoryNameKo: "게임",
    releaseYear: 2026,
    releaseDate: "2026-10",
    thumbnailUrl: null,
    description: "요구사항 3의 우선 편성 대상 콘텐츠로, 글로벌 리액션과 해설 영상 수집을 강화합니다.",
    heroMessageKo: "2026년 10월 출시 예정 기준으로 홈 히어로와 게임 대표 슬롯에 우선 편성합니다.",
    priorityScore: 100,
    isEditorialPick: true,
    reactionCount: 18,
    totalViews: 980000,
    latestReactionAt: "2026-06-02T08:00:00.000Z",
    aliases: [
      "Call of Duty Modern Warfare 4",
      "COD MW4",
      "모던 워페어 4",
      "콜 오브 듀티 모던 워페어 4",
    ],
    searchKeywords: [
      "\"Call of Duty: Modern Warfare 4\" reaction game",
      "\"COD MW4\" reaction",
      "\"Modern Warfare 4\" trailer reaction",
    ],
  }),
];

const createReaction = (
  id: number,
  youtubeVideoId: string,
  title: string,
  publishedAt: string,
  viewCount: number,
  channelName: string,
  overrides: Partial<ReactionVideo> = {},
): ReactionVideo => ({
  id,
  youtubeVideoId,
  title,
  titleOriginal: overrides.titleOriginal ?? title,
  titleTranslationSource: overrides.titleTranslationSource ?? "original",
  hasTitleTranslation: overrides.hasTitleTranslation ?? false,
  description: overrides.description ?? null,
  descriptionOriginal: overrides.descriptionOriginal ?? overrides.description ?? null,
  descriptionTranslationSource: overrides.descriptionTranslationSource ?? null,
  hasDescriptionTranslation: overrides.hasDescriptionTranslation ?? false,
  thumbnailUrl: overrides.thumbnailUrl ?? null,
  publishedAt,
  viewCount,
  likeCount: overrides.likeCount ?? Math.floor(viewCount / 18),
  commentCount: overrides.commentCount ?? Math.floor(viewCount / 150),
  youtubeUrl: `https://www.youtube.com/watch?v=${youtubeVideoId}`,
  embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeVideoId}?playsinline=1&rel=0&modestbranding=1`,
  channelName,
});

const previewReactions: Record<string, ReactionVideo[]> = {
  "extreme-job": [
    createReaction(
      1,
      "exjobrx0001",
      "Americans react to Extreme Job",
      "2026-05-30T00:00:00.000Z",
      312000,
      "ReactKing",
      {
        description: "미국 시청자들이 한국 코미디의 빠른 전개와 액션 전환에 놀라는 반응입니다.",
        descriptionOriginal:
          "The hosts were surprised by how quickly the comedy escalated into action.",
        descriptionTranslationSource: "machine",
        hasDescriptionTranslation: true,
      },
    ),
    createReaction(
      2,
      "exjobrx0002",
      "Extreme Job first time watch",
      "2026-05-29T20:00:00.000Z",
      208000,
      "FilmReact",
    ),
  ],
  "squid-game-2": [
    createReaction(
      3,
      "sqg2trlr001",
      "Squid Game Season 2 trailer reaction",
      "2026-05-30T04:10:00.000Z",
      620000,
      "DramaScope",
      {
        description: "새 시즌의 규모감과 긴장감을 중심으로 한 트레일러 반응입니다.",
      },
    ),
  ],
  apt: [
    createReaction(
      4,
      "aptmvreact1",
      "APT. MV reaction and vocal breakdown",
      "2026-05-30T05:00:00.000Z",
      540000,
      "Kpop Room",
      {
        description: "뮤직비디오의 보컬 레이어와 퍼포먼스를 함께 해설하는 반응입니다.",
      },
    ),
  ],
  "solo-leveling": [
    createReaction(
      5,
      "sololv00001",
      "Solo Leveling episode 1 reaction",
      "2026-05-29T23:45:00.000Z",
      130000,
      "AnimeOrbit",
    ),
  ],
  "call-of-duty-modern-warfare-4": [
    createReaction(
      6,
      "codmw4rx01a",
      "Call of Duty: Modern Warfare 4 trailer reaction",
      "2026-06-02T08:00:00.000Z",
      420000,
      "GlobalFPS",
      {
        description: "게임 플레이 연출과 캠페인 복귀 포인트를 중심으로 정리한 대표 리액션입니다.",
        titleOriginal: "Call of Duty: Modern Warfare 4 trailer reaction",
      },
    ),
    createReaction(
      7,
      "codmw4rx02b",
      "FPS fans react to COD MW4 reveal",
      "2026-06-01T23:40:00.000Z",
      240000,
      "ShooterLab",
    ),
  ],
};

const previewContentMap = new Map(previewContents.map((content) => [content.slug, content]));

const previewTop10: HomePayload["top10"] = previewContents
  .slice()
  .sort((left, right) => right.totalViews - left.totalViews || right.reactionCount - left.reactionCount)
  .map((content, index) => ({
    rank: index + 1,
    contentSlug: content.slug,
    titleKo: content.titleKo,
    categorySlug: content.categorySlug,
    categoryNameKo: content.categoryNameKo,
    reactionCount: content.reactionCount,
    totalViews: content.totalViews,
    thumbnailUrl: content.thumbnailUrl,
  }));

const previewHome: HomePayload = {
  siteCopy: {
    brandName: "AwesomeKorea",
    brandTagline: "Awesome Korea - 해외 반응 모음",
    heroBadge: "운영 우선 편성",
    heroToolbarCopy: "편성 슬롯과 우선순위 점수를 조합해 홈 노출 순서를 운영합니다.",
    heroTitle: "운영자가 직접 고른 해외 반응을 먼저 보여드립니다.",
    heroDescription: "요구사항 3 기준으로 게임 카테고리와 콜 오브 듀티 우선 편성을 반영한 예시입니다.",
  },
  hero: {
    contentSlug: "call-of-duty-modern-warfare-4",
    titleKo: "콜 오브 듀티: 모던 워페어 4",
    categoryNameKo: "게임",
    reactionCount: 18,
    message: "2026년 10월 출시 예정 기준 우선 편성 콘텐츠",
    releaseDate: "2026-10",
  },
  featuredContents: [
    {
      slotCode: "home.featured.contents",
      headline: "운영 우선 콘텐츠",
      body: "게임 카테고리 오픈과 함께 대표 콘텐츠를 홈 추천 영역에 고정합니다.",
      content: previewContentMap.get("call-of-duty-modern-warfare-4")!,
    },
    {
      slotCode: "home.featured.contents",
      headline: "트렌드 반응 묶음",
      body: "글로벌 주목도가 높은 드라마도 함께 추천 영역에 배치합니다.",
      content: previewContentMap.get("squid-game-2")!,
    },
  ],
  featuredReactions: [
    {
      sortOrder: 1,
      contentSlug: "call-of-duty-modern-warfare-4",
      contentTitle: "콜 오브 듀티: 모던 워페어 4",
      categorySlug: "game",
      categoryNameKo: "게임",
      reactionCount: 18,
      totalViews: 980000,
      reaction: previewReactions["call-of-duty-modern-warfare-4"]![0]!,
    },
    {
      sortOrder: 2,
      contentSlug: "squid-game-2",
      contentTitle: "오징어 게임 시즌 2",
      categorySlug: "drama",
      categoryNameKo: "드라마",
      reactionCount: 110,
      totalViews: 6100000,
      reaction: previewReactions["squid-game-2"]![0]!,
    },
  ],
  top10: previewTop10,
  popularByCategory: [
    {
      categorySlug: "all",
      categoryNameKo: "전체",
      items: previewContents
        .slice()
        .sort((left, right) => right.priorityScore - left.priorityScore || right.totalViews - left.totalViews),
    },
    ...previewCategories.map((category) => ({
      categorySlug: category.slug,
      categoryNameKo: category.nameKo,
      items: previewContents.filter((item) => item.categorySlug === category.slug),
    })),
  ],
  updatedAt: "2026-06-02T09:00:00.000Z",
};

const previewComments: Record<string, ReactionCommentsPayload> = {
  codmw4rx01a: {
    locale: "ko",
    videoId: "codmw4rx01a",
    status: "ok",
    order: "relevance",
    strategy: "topN",
    fetchedAll: false,
    pageSize: 20,
    fetchedCount: 2,
    totalCommentCount: 840,
    estimatedQuotaUnits: 1,
    message: "우선 편성 콘텐츠의 대표 댓글을 먼저 번역해 보여주는 예시입니다.",
    items: [
      {
        id: "cod-comment-1",
        authorDisplayName: "FPSFanWorld",
        authorProfileImageUrl: null,
        text: "캠페인 복귀 연출이 강해서 반응 영상도 빨리 늘어날 것 같아요.",
        originalText: "The campaign comeback looks huge. Reaction uploads will explode.",
        translationSource: "machine",
        hasTranslation: true,
        likeCount: 240,
        publishedAt: "2026-06-02T08:20:00.000Z",
        updatedAt: "2026-06-02T08:20:00.000Z",
        replyCount: 1,
        replies: [
          {
            id: "cod-comment-1-reply-1",
            authorDisplayName: "ShooterNerd",
            authorProfileImageUrl: null,
            text: "멀티플레이 공개가 나오면 더 커질 것 같습니다.",
            originalText: "It will get bigger once multiplayer footage drops.",
            translationSource: "machine",
            hasTranslation: true,
            likeCount: 42,
            publishedAt: "2026-06-02T08:31:00.000Z",
          },
        ],
      },
      {
        id: "cod-comment-2",
        authorDisplayName: "TrailerBreakdown",
        authorProfileImageUrl: null,
        text: "키워드 설정을 잘 하면 FPS 장르 반응까지 넓게 잡힐 것 같네요.",
        originalText: "Good keyword coverage should catch broader FPS reaction videos too.",
        translationSource: "machine",
        hasTranslation: true,
        likeCount: 119,
        publishedAt: "2026-06-02T08:47:00.000Z",
        updatedAt: "2026-06-02T08:47:00.000Z",
        replyCount: 0,
        replies: [],
      },
    ],
  },
};

const previewReplies: Record<string, ReactionCommentRepliesPayload> = {
  "codmw4rx01a:cod-comment-1": {
    locale: "ko",
    videoId: "codmw4rx01a",
    commentId: "cod-comment-1",
    status: "ok",
    fetchedCount: 1,
    estimatedQuotaUnits: 1,
    message: "답글 번역 예시입니다.",
    items: [
      {
        id: "cod-comment-1-reply-1",
        authorDisplayName: "ShooterNerd",
        authorProfileImageUrl: null,
        text: "멀티플레이 공개가 나오면 더 커질 것 같습니다.",
        originalText: "It will get bigger once multiplayer footage drops.",
        translationSource: "machine",
        hasTranslation: true,
        likeCount: 42,
        publishedAt: "2026-06-02T08:31:00.000Z",
      },
    ],
  },
};

const sortContents = (items: ContentSummary[], sort: "popular" | "latest") =>
  [...items].sort((left, right) => {
    if (sort === "latest") {
      return (
        left.priorityScore !== right.priorityScore
          ? right.priorityScore - left.priorityScore
          : String(right.latestReactionAt).localeCompare(String(left.latestReactionAt)) ||
            right.totalViews - left.totalViews
      );
    }

    return (
      right.priorityScore - left.priorityScore ||
      right.totalViews - left.totalViews ||
      right.reactionCount - left.reactionCount
    );
  });

const sortReactions = (items: ReactionVideo[], sort: "popular" | "latest") =>
  [...items].sort((left, right) => {
    if (sort === "latest") {
      return String(right.publishedAt).localeCompare(String(left.publishedAt)) || right.viewCount - left.viewCount;
    }

    return right.viewCount - left.viewCount || String(right.publishedAt).localeCompare(String(left.publishedAt));
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
    const slug = decodeURIComponent(detailMatch[1] ?? "");
    const content = previewContentMap.get(slug);

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

  const reactionsMatch = url.pathname.match(/^\/api\/contents\/([^/]+)\/reactions$/);

  if (reactionsMatch) {
    const slug = decodeURIComponent(reactionsMatch[1] ?? "");
    const content = previewContentMap.get(slug);

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

  const repliesMatch = url.pathname.match(/^\/api\/reactions\/([^/]+)\/comments\/([^/]+)\/replies$/);

  if (repliesMatch) {
    const videoId = decodeURIComponent(repliesMatch[1] ?? "");
    const commentId = decodeURIComponent(repliesMatch[2] ?? "");

    return (
      previewReplies[`${videoId}:${commentId}`] ?? {
        locale: "ko",
        videoId,
        commentId,
        status: "empty",
        fetchedCount: 0,
        estimatedQuotaUnits: 1,
        message: "답글이 없습니다.",
        items: [],
      }
    );
  }

  const commentsMatch = url.pathname.match(/^\/api\/reactions\/([^/]+)\/comments$/);

  if (commentsMatch) {
    const videoId = decodeURIComponent(commentsMatch[1] ?? "");

    return (
      previewComments[videoId] ?? {
        locale: "ko",
        videoId,
        status: "empty",
        order: "relevance",
        strategy: "full",
        fetchedAll: true,
        pageSize: 20,
        fetchedCount: 0,
        totalCommentCount: 0,
        estimatedQuotaUnits: 0,
        message: "표시할 댓글이 없습니다.",
        items: [],
      }
    );
  }

  return null;
};
