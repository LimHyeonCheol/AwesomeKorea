import type {
  Category,
  ContentDetailPayload,
  ReactionCommentRepliesPayload,
  ReactionCommentsPayload,
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
  options: {
    description?: string | null;
    descriptionOriginal?: string | null;
    titleOriginal?: string;
    titleTranslationSource?: ReactionVideo["titleTranslationSource"];
  } = {},
): ReactionVideo => ({
  id,
  youtubeVideoId,
  title,
  titleOriginal: options.titleOriginal ?? title,
  titleTranslationSource:
    options.titleTranslationSource ??
    ((options.titleOriginal ?? title) === title ? "original" : "machine"),
  hasTitleTranslation: (options.titleOriginal ?? title) !== title,
  description: options.description ?? null,
  descriptionOriginal: options.descriptionOriginal ?? options.description ?? null,
  descriptionTranslationSource:
    options.description && options.descriptionOriginal && options.description !== options.descriptionOriginal
      ? "machine"
      : options.description
        ? "original"
        : null,
  hasDescriptionTranslation:
    Boolean(options.description) &&
    (options.descriptionOriginal ?? options.description ?? null) !== options.description,
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

const previewComments: Record<string, ReactionCommentsPayload> = {
  "react-001": {
    locale: "ko",
    videoId: "react-001",
    status: "ok",
    order: "relevance",
    strategy: "topN",
    fetchedAll: false,
    pageSize: 20,
    fetchedCount: 3,
    totalCommentCount: 1400,
    estimatedQuotaUnits: 1,
    message:
      "댓글 1개마다 quota가 차감되는 구조는 아니지만, 페이지 요청마다 quota 1이 소모돼 인기 댓글 50개만 먼저 보여드려요.",
    items: [
      {
        id: "preview-comment-1",
        authorDisplayName: "MovieLover88",
        authorProfileImageUrl: null,
        text:
          "이 영화는 액션 템포도 좋지만 코미디 타이밍이 정말 좋네요. 해외 반응이 많은 이유를 알겠어요.",
        originalText:
          "???곹솕???≪뀡 ?쒗룷??醫뗭?留?肄붾?????대컢???뺣쭚 醫뗫꽕?? ?댁쇅 諛섏쓳??留롮? ?댁쑀瑜??뚭쿋?댁슂.",
        translationSource: "original",
        hasTranslation: false,
        likeCount: 328,
        publishedAt: "2026-05-30T02:12:00.000Z",
        updatedAt: "2026-05-30T02:12:00.000Z",
        replyCount: 2,
        replies: [
          {
            id: "preview-comment-1-reply-1",
            authorDisplayName: "KoreanCinemaClub",
            authorProfileImageUrl: null,
            text: "특히 후반부 전개가 외국 시청자에게도 잘 먹히는 것 같아요.",
            originalText: "?뱁엳 ?꾨컲遺 ?꾧컻媛 ?멸뎅 ?쒖껌?먯뿉寃뚮룄 ??癒뱁엳??寃?媛숈븘??",
            translationSource: "original",
            hasTranslation: false,
            likeCount: 41,
            publishedAt: "2026-05-30T03:05:00.000Z",
          },
        ],
      },
      {
        id: "preview-comment-2",
        authorDisplayName: "FirstTimeWatcher",
        authorProfileImageUrl: null,
        text: "처음 봤는데 생각보다 더 세련된 연출이라 놀랐습니다.",
        originalText: "泥섏쓬 遊ㅻ뒗???앷컖蹂대떎 ???몃젴???곗텧?대씪 ??먯뒿?덈떎.",
        translationSource: "original",
        hasTranslation: false,
        likeCount: 174,
        publishedAt: "2026-05-30T04:20:00.000Z",
        updatedAt: "2026-05-30T04:20:00.000Z",
        replyCount: 0,
        replies: [],
      },
      {
        id: "preview-comment-3",
        authorDisplayName: "LaughTrackDaily",
        authorProfileImageUrl: null,
        text: "채널 주인장 리액션도 좋지만 관객 반응 같이 보는 재미가 있네요.",
        originalText: "梨꾨꼸 二쇱씤??由ъ븸?섎룄 醫뗭?留?愿媛?諛섏쓳 媛숈씠 蹂대뒗 ?щ?媛 ?덈꽕??",
        translationSource: "original",
        hasTranslation: false,
        likeCount: 102,
        publishedAt: "2026-05-30T06:10:00.000Z",
        updatedAt: "2026-05-30T06:10:00.000Z",
        replyCount: 1,
        replies: [
          {
            id: "preview-comment-3-reply-1",
            authorDisplayName: "GlobalViewer",
            authorProfileImageUrl: null,
            text: "그래서 이 앱에서 댓글 같이 보는 구성이 잘 어울려요.",
            originalText: "洹몃옒?????깆뿉???볤? 媛숈씠 蹂대뒗 援ъ꽦?????댁슱?ㅼ슂.",
            translationSource: "original",
            hasTranslation: false,
            likeCount: 18,
            publishedAt: "2026-05-30T06:44:00.000Z",
          },
        ],
      },
    ],
  },
};

const previewReplies: Record<string, ReactionCommentRepliesPayload> = {
  "react-001:preview-comment-1": {
    locale: "ko",
    videoId: "react-001",
    commentId: "preview-comment-1",
    status: "ok",
    fetchedCount: 1,
    estimatedQuotaUnits: 1,
    message: "답글을 한국어로 정리했어요.",
    items: [
      {
        id: "preview-comment-1-reply-1",
        authorDisplayName: "KoreanCinemaClub",
        authorProfileImageUrl: null,
        text: "?뱁엳 ?꾨컲遺 ?꾧컻媛 ?멸뎅 ?쒖껌?먯뿉寃뚮룄 ??癒뱁엳??寃?媛숈븘??",
        originalText: "?뱁엳 ?꾨컲遺 ?꾧컻媛 ?멸뎅 ?쒖껌?먯뿉寃뚮룄 ??癒뱁엳??寃?媛숈븘??",
        translationSource: "original",
        hasTranslation: false,
        likeCount: 41,
        publishedAt: "2026-05-30T03:05:00.000Z",
      },
    ],
  },
  "react-001:preview-comment-3": {
    locale: "ko",
    videoId: "react-001",
    commentId: "preview-comment-3",
    status: "ok",
    fetchedCount: 1,
    estimatedQuotaUnits: 1,
    message: "답글을 한국어로 정리했어요.",
    items: [
      {
        id: "preview-comment-3-reply-1",
        authorDisplayName: "GlobalViewer",
        authorProfileImageUrl: null,
        text: "洹몃옒?????깆뿉???볤? 媛숈씠 蹂대뒗 援ъ꽦?????댁슱?ㅼ슂.",
        originalText: "洹몃옒?????깆뿉???볤? 媛숈씠 蹂대뒗 援ъ꽦?????댁슱?ㅼ슂.",
        translationSource: "original",
        hasTranslation: false,
        likeCount: 18,
        publishedAt: "2026-05-30T06:44:00.000Z",
      },
    ],
  },
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
  siteCopy: {
    brandName: "어썸코리아",
    brandTagline: "Awesome Korea - 해외 반응 모음",
    heroBadge: "관리자 추천",
    heroToolbarCopy: "운영자가 직접 고른 해외 유튜브 반응을 메인에서 빠르게 살펴보세요.",
    heroTitle: "지금 소개할 대표 반응을 운영자가 직접 편성합니다.",
    heroDescription:
      "대문 문구, 카테고리, 유튜브 제목과 소개글, 메인 대표 반응까지 모두 관리자에서 조정할 수 있습니다.",
  },
  hero: {
    contentSlug: "extreme-job",
    titleKo: "극한직업",
    categoryNameKo: "영화",
    reactionCount: 47,
    message: "오늘 가장 많이 본 반응 콘텐츠",
  },
  featuredReactions: [
    {
      sortOrder: 1,
      contentSlug: "extreme-job",
      contentTitle: "극한직업",
      categorySlug: "movie",
      categoryNameKo: "영화",
      reactionCount: 47,
      totalViews: 2100000,
      reaction: previewReactions["extreme-job"]![0]!,
    },
    {
      sortOrder: 2,
      contentSlug: "squid-game-2",
      contentTitle: "오징어게임 S2",
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

  const commentMatch = url.pathname.match(/^\/api\/reactions\/([^/]+)\/comments$/);

  const replyMatch = url.pathname.match(/^\/api\/reactions\/([^/]+)\/comments\/([^/]+)\/replies$/);

  if (replyMatch) {
    const rawVideoId = replyMatch[1];
    const rawCommentId = replyMatch[2];

    if (!rawVideoId || !rawCommentId) {
      return null;
    }

    return (
      previewReplies[`${decodeURIComponent(rawVideoId)}:${decodeURIComponent(rawCommentId)}`] ?? {
        locale: "ko",
        videoId: decodeURIComponent(rawVideoId),
        commentId: decodeURIComponent(rawCommentId),
        status: "empty",
        fetchedCount: 0,
        estimatedQuotaUnits: 1,
        message: "?꾩쭅 ?쒖떆???듦????놁뼱??",
        items: [],
      }
    );
  }

  if (commentMatch) {
    const rawVideoId = commentMatch[1];

    if (!rawVideoId) {
      return null;
    }

    return previewComments[decodeURIComponent(rawVideoId)] ?? {
      locale: "ko",
      videoId: decodeURIComponent(rawVideoId),
      status: "empty",
      order: "relevance",
      strategy: "full",
      fetchedAll: true,
      pageSize: 20,
      fetchedCount: 0,
      totalCommentCount: 0,
      estimatedQuotaUnits: 0,
      message: "아직 표시할 댓글이 없어요.",
      items: [],
    };
  }

  return null;
};
