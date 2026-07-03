import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AdminSessionPayload, ContentStatus, HomeSiteCopy } from "@awesomekorea/shared";

import { clampLimit, clampPage, parseSort } from "./lib/pagination";
import {
  createAdminCategory,
  createAdminContent,
  deleteAdminCategory,
  deleteAdminContent,
  getAdminContentDetail,
  getAdminDashboard,
  saveAdminHomeSettings,
  updateAdminCategory,
  updateAdminContent,
} from "./repositories/admin-repository";
import { getAdminUserByLoginId } from "./repositories/admin-auth-repository";
import {
  getCategories,
  getContentBySlug,
  getFeaturedReactionByContentSlug,
  getContentList,
  getHomePayload,
  getReactionTranslationContextByYoutubeVideoId,
  getReactionsByContentSlug,
} from "./repositories/catalog-repository";
import { bumpCacheVersion, withCache } from "./services/cache-service";
import { ensureBootstrapContentData } from "./services/bootstrap-service";
import {
  assertAllowedAdminOrigin,
  clearAdminSession,
  createAdminSession,
  requireAdminSession,
  verifyAdminPassword,
} from "./services/admin-auth-service";
import { rebuildRankings } from "./services/ranking-service";
import {
  createUnavailableCommentsPayload,
  createUnavailableRepliesPayload,
  getYoutubeReactionCommentReplies,
  getYoutubeReactionComments,
  YoutubeCommentsUnavailableError,
} from "./services/youtube-comments-service";
import { syncYoutubeReactions } from "./services/youtube-sync-service";
import type { AppBindings } from "./types";

const app = new Hono<AppBindings>();

app.use(
  "/api/*",
  cors({
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    origin: (origin) => origin || "*",
  }),
);

const applySecurityHeaders = (headers: Headers) => {
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Permissions-Policy", "camera=(), geolocation=(), microphone=()");
};

const createSecurityHeaderRecord = () => ({
  "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
});

app.use("*", async (c, next) => {
  await next();
  applySecurityHeaders(c.res.headers);
});

const HOME_CACHE_TTL_SECONDS = 60 * 10;
const CONTENT_LIST_CACHE_TTL_SECONDS = 60 * 10;
const CONTENT_DETAIL_CACHE_TTL_SECONDS = 60 * 5;
const REACTION_LIST_CACHE_TTL_SECONDS = 60 * 5;
const REACTION_COMMENTS_CACHE_TTL_SECONDS = 60 * 30;
const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const assertInternalToken = (c: {
  env: AppBindings["Bindings"];
  req: {
    header: (name: string) => string | undefined;
  };
}) => {
  const expectedToken = c.env.INTERNAL_API_TOKEN;
  const appEnv = c.env.APP_ENV ?? "local";

  if (!expectedToken) {
    if (appEnv !== "local") {
      throw new HTTPException(503, {
        message: "?댁쁺 ?대? API ?좏겙???ㅼ젙?섏? ?딆븯?듬땲??",
      });
    }

    return;
  }

  const authorizationHeader = c.req.header("Authorization");

  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw new HTTPException(401, {
      message: "?대? API ?좏겙???꾩슂?⑸땲??",
    });
  }

  const providedToken = authorizationHeader.slice("Bearer ".length);

  if (providedToken !== expectedToken) {
    throw new HTTPException(401, {
      message: "?대? API ?좏겙???좏슚?섏? ?딆뒿?덈떎.",
    });
  }
};

const loadAdminProfile = async (
  c: Context<AppBindings>,
) =>
  requireAdminSession(c, async (loginId) =>
    getAdminUserByLoginId(c.env.DB, loginId),
  );

const buildContentListCacheKey = (
  category: string | undefined,
  sort: string,
  page: number,
  limit: number,
) => `contents:${category ?? "all"}:${sort}:${page}:${limit}`;

const readJsonBody = async (c: {
  req: {
    json: () => Promise<unknown>;
  };
}) => {
  try {
    return (await c.req.json()) as Record<string, unknown>;
  } catch {
    throw new HTTPException(400, {
      message: "?붿껌 蹂몃Ц???щ컮瑜?JSON ?뺤떇???꾨땲?먯슂.",
    });
  }
};

const requireStringField = (value: unknown, fieldLabel: string) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HTTPException(400, {
      message: `${fieldLabel} 媛믪쓣 ?낅젰??二쇱꽭??`,
    });
  }

  return value.trim();
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const requireSlugField = (
  value: unknown,
  fieldLabel: string,
  options: {
    disallowAll?: boolean;
  } = {},
) => {
  const normalized = requireStringField(value, fieldLabel).toLowerCase();

  if (!SLUG_PATTERN.test(normalized)) {
    throw new HTTPException(400, {
      message: `${fieldLabel}은(는) 영문 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다.`,
    });
  }

  if (options.disallowAll && normalized === "all") {
    throw new HTTPException(400, {
      message: `${fieldLabel}에 all은 사용할 수 없습니다.`,
    });
  }

  return normalized;
};

const optionalStringField = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseBooleanField = (value: unknown, fallback = false) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === 1 || value === "1" || value === "true") {
    return true;
  }

  if (value === 0 || value === "0" || value === "false") {
    return false;
  }

  return fallback;
};

const parseIntegerField = (
  value: unknown,
  fieldLabel: string,
  options: {
    allowNull?: boolean;
    fallback?: number;
    min?: number;
  } = {},
) => {
  if ((value === null || value === undefined || value === "") && options.allowNull) {
    return null;
  }

  const parsed = Number(value ?? options.fallback ?? 0);

  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    throw new HTTPException(400, {
      message: `${fieldLabel} 媛믪? ?뺤닔?ъ빞 ?⑸땲??`,
    });
  }

  if (options.min !== undefined && parsed < options.min) {
    throw new HTTPException(400, {
      message: `${fieldLabel} 媛믪? ${options.min} ?댁긽?댁뼱???⑸땲??`,
    });
  }

  return parsed;
};

const parseAliasesField = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  return [];
};

const parseContentStatusField = (value: unknown): ContentStatus => {
  if (value === "active" || value === "hidden") {
    return value;
  }

  throw new HTTPException(400, {
    message: "肄섑뀗痢??곹깭??active ?먮뒗 hidden ?댁뼱???⑸땲??",
  });
};

const parseHomeSettingsPayload = (payload: Record<string, unknown>): HomeSiteCopy => ({
  brandName: requireStringField(payload.brandName, "釉뚮옖?쒕챸"),
  brandTagline: requireStringField(payload.brandTagline, "釉뚮옖???쒓렇?쇱씤"),
  heroBadge: requireStringField(payload.heroBadge, "?덉뼱濡?諛곗?"),
  heroToolbarCopy: requireStringField(payload.heroToolbarCopy, "?덉뼱濡??곷떒 臾멸뎄"),
  heroTitle: requireStringField(payload.heroTitle, "?臾??쒕ぉ"),
  heroDescription: requireStringField(payload.heroDescription, "?臾??ㅻ챸"),
});

const parseCategoryPayload = (payload: Record<string, unknown>) => ({
  slug: requireSlugField(payload.slug, "카테고리 slug", {
    disallowAll: true,
  }),
  nameKo: requireStringField(payload.nameKo, "카테고리명"),
  sortOrder: parseIntegerField(payload.sortOrder, "카테고리 정렬 순서", {
    fallback: 0,
    min: 0,
  }) as number,
  isActive: parseBooleanField(payload.isActive, true),
});

const parseContentCreatePayload = (payload: Record<string, unknown>) => ({
  categoryId: parseIntegerField(payload.categoryId, "카테고리", {
    min: 1,
  }) as number,
  slug: requireSlugField(payload.slug, "콘텐츠 slug"),
  titleKo: requireStringField(payload.titleKo, "콘텐츠 제목(국문)"),
  titleEn: optionalStringField(payload.titleEn),
  releaseYear: parseIntegerField(payload.releaseYear, "출시 연도", {
    allowNull: true,
  }) as number | null,
  releaseDate: optionalStringField(payload.releaseDate),
  status:
    payload.status === undefined ? "active" : parseContentStatusField(payload.status),
});

const parseContentPayload = (payload: Record<string, unknown>) => ({
  categoryId: parseIntegerField(payload.categoryId, "카테고리", {
    min: 1,
  }) as number,
  slug: requireSlugField(payload.slug, "콘텐츠 slug"),
  titleKo: requireStringField(payload.titleKo, "콘텐츠 제목(국문)"),
  titleEn: optionalStringField(payload.titleEn),
  aliases: parseAliasesField(payload.aliases),
  releaseYear: parseIntegerField(payload.releaseYear, "출시 연도", {
    allowNull: true,
  }) as number | null,
  releaseDate: optionalStringField(payload.releaseDate),
  thumbnailUrl: optionalStringField(payload.thumbnailUrl),
  description: optionalStringField(payload.description),
  searchKeywords: parseAliasesField(payload.searchKeywords),
  priorityScore: parseIntegerField(payload.priorityScore, "우선순위", {
    fallback: 0,
    min: 0,
  }) as number,
  heroMessageKo: optionalStringField(payload.heroMessageKo),
  status: parseContentStatusField(payload.status),
});

app.get("/", (c) =>
  c.json({
    service: "awesomekorea-api",
    status: "ok",
    phase: ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6"],
  }),
);

app.get("/api/health", (c) =>
  c.json({
    appEnv: c.env.APP_ENV ?? "unknown",
    service: "awesomekorea-api",
    status: "ok",
  }),
);

app.get("/api/categories", async (c) => {
  await ensureBootstrapContentData(c.env);
  const categories = await getCategories(c.env.DB);

  return c.json({
    items: categories,
  });
});

app.get("/api/home", async (c) => {
  await ensureBootstrapContentData(c.env);
  const payload = await withCache(c.env.CONTENT_CACHE, "home", HOME_CACHE_TTL_SECONDS, () =>
    getHomePayload(c.env.DB),
  );

  return c.json(payload);
});

app.get("/api/contents", async (c) => {
  await ensureBootstrapContentData(c.env);
  const category = c.req.query("category");
  const sort = parseSort(c.req.query("sort"));
  const page = clampPage(c.req.query("page"));
  const limit = clampLimit(c.req.query("limit"));
  const payload = await withCache(
    c.env.CONTENT_CACHE,
    buildContentListCacheKey(category, sort, page, limit),
    CONTENT_LIST_CACHE_TTL_SECONDS,
    () =>
      getContentList(c.env.DB, {
        category,
        sort,
        page,
        limit,
      }),
  );

  return c.json(payload);
});

app.get("/api/contents/:slug", async (c) => {
  await ensureBootstrapContentData(c.env);
  const slug = c.req.param("slug");
  const payload = await withCache(
    c.env.CONTENT_CACHE,
    `content:${slug}`,
    CONTENT_DETAIL_CACHE_TTL_SECONDS,
    async () => {
      const content = await getContentBySlug(c.env.DB, slug);

      if (!content) {
        throw new HTTPException(404, {
          message: "肄섑뀗痢좊? 李얠쓣 ???놁뒿?덈떎.",
        });
      }

      const featuredReaction = await getFeaturedReactionByContentSlug(c.env.DB, slug);

      return {
        content,
        featuredReaction,
        availableSorts: ["popular", "latest"] as const,
      };
    },
  );

  if (!payload) {
    throw new HTTPException(404, {
      message: "肄섑뀗痢좊? 李얠쓣 ???놁뒿?덈떎.",
    });
  }

  return c.json(payload);
});

app.get("/api/contents/:slug/reactions", async (c) => {
  await ensureBootstrapContentData(c.env);
  const slug = c.req.param("slug");
  const content = await getContentBySlug(c.env.DB, slug);

  if (!content) {
    throw new HTTPException(404, {
      message: "肄섑뀗痢좊? 李얠쓣 ???놁뒿?덈떎.",
    });
  }

  const sort = parseSort(c.req.query("sort"));
  const page = clampPage(c.req.query("page"));
  const limit = clampLimit(c.req.query("limit"), 10, 30);
  const payload = await withCache(
    c.env.CONTENT_CACHE,
    `reactions:${slug}:${sort}:${page}:${limit}`,
    REACTION_LIST_CACHE_TTL_SECONDS,
    async () => {
      const [featuredReaction, reactions] = await Promise.all([
        getFeaturedReactionByContentSlug(c.env.DB, slug),
        getReactionsByContentSlug(c.env.DB, {
          slug,
          sort,
          page,
          limit,
        }),
      ]);

      return {
        content: {
          slug: content.slug,
          titleKo: content.titleKo,
          categoryNameKo: content.categoryNameKo,
        },
        featuredReaction,
        sort,
        ...reactions,
      };
    },
  );

  return c.json(payload);
});

app.get("/api/reactions/:youtubeVideoId/comments", async (c) => {
  await ensureBootstrapContentData(c.env);
  const youtubeVideoId = c.req.param("youtubeVideoId");
  const limit = clampLimit(c.req.query("limit"), 20, 50);

  if (!YOUTUBE_VIDEO_ID_PATTERN.test(youtubeVideoId)) {
    throw new HTTPException(400, {
      message: "?좏슚???좏뒠釉??곸긽 ID媛 ?꾨땲?먯슂.",
    });
  }

  const reactionContext = await getReactionTranslationContextByYoutubeVideoId(c.env.DB, youtubeVideoId);

  if (!reactionContext) {
    throw new HTTPException(404, {
      message: "?볤???遺덈윭??諛섏쓳 ?곸긽??李얠쓣 ???놁뼱??",
    });
  }

  if (!c.env.YOUTUBE_API_KEY) {
    return c.json(
      createUnavailableCommentsPayload(
        youtubeVideoId,
        reactionContext.commentCount,
        "?볤? API ?ㅺ? ?ㅼ젙?섏? ?딆븘 吏湲덉? ?볤???遺덈윭?????놁뼱??",
        limit,
      ),
    );
  }

  try {
    const payload = await withCache(
      c.env.CONTENT_CACHE,
      `reaction-comments:${youtubeVideoId}:ko:${limit}:v${reactionContext.commentCount}`,
      REACTION_COMMENTS_CACHE_TTL_SECONDS,
      () =>
        getYoutubeReactionComments({
          apiKey: c.env.YOUTUBE_API_KEY as string,
          context: reactionContext,
          env: c.env,
          limit,
        }),
    );

    return c.json(payload);
  } catch (error) {
    if (error instanceof YoutubeCommentsUnavailableError) {
      return c.json(
        createUnavailableCommentsPayload(
          youtubeVideoId,
          reactionContext.commentCount,
          error.message,
          limit,
        ),
        200,
      );
    }

    throw error;
  }
});

app.get("/api/reactions/:youtubeVideoId/comments/:commentId/replies", async (c) => {
  await ensureBootstrapContentData(c.env);
  const youtubeVideoId = c.req.param("youtubeVideoId");
  const commentId = c.req.param("commentId");

  if (!YOUTUBE_VIDEO_ID_PATTERN.test(youtubeVideoId)) {
    throw new HTTPException(400, {
      message: "?醫륁뒞???醫뤿뮔???怨멸맒 ID揶쎛 ?袁⑤빍?癒?뒄.",
    });
  }

  if (!commentId) {
    throw new HTTPException(400, {
      message: "?蹂? ID揶쎛 ?袁⑹뒄??몃빍??",
    });
  }

  const reactionContext = await getReactionTranslationContextByYoutubeVideoId(c.env.DB, youtubeVideoId);

  if (!reactionContext) {
    throw new HTTPException(404, {
      message: "?蹂????븍뜄???獄쏆꼷???怨멸맒??筌≪뼚??????곷선??",
    });
  }

  if (!c.env.YOUTUBE_API_KEY) {
    return c.json(
      createUnavailableRepliesPayload(
        youtubeVideoId,
        commentId,
        "?蹂? API ??? ??쇱젟??? ??녿툡 筌왖疫뀀뜆? ?????븍뜄???????곷선??",
      ),
    );
  }

  try {
    const payload = await withCache(
      c.env.CONTENT_CACHE,
      `reaction-comment-replies:${youtubeVideoId}:${encodeURIComponent(commentId)}:ko`,
      REACTION_COMMENTS_CACHE_TTL_SECONDS,
      () =>
        getYoutubeReactionCommentReplies({
          apiKey: c.env.YOUTUBE_API_KEY as string,
          commentId,
          context: reactionContext,
          env: c.env,
        }),
    );

    return c.json(payload);
  } catch (error) {
    if (error instanceof YoutubeCommentsUnavailableError) {
      return c.json(
        createUnavailableRepliesPayload(youtubeVideoId, commentId, error.message),
        200,
      );
    }

    throw error;
  }
});

app.post("/api/admin/login", async (c) => {
  assertAllowedAdminOrigin(c);
  c.header("Cache-Control", "no-store");

  const payload = await readJsonBody(c);
  const loginId = requireStringField(payload.loginId, "아이디");
  const password = requireStringField(payload.password, "비밀번호");
  const adminUser = await getAdminUserByLoginId(c.env.DB, loginId);

  if (!adminUser || !adminUser.isActive || !verifyAdminPassword(password, adminUser.passwordHash)) {
    throw new HTTPException(401, {
      message: "아이디 또는 비밀번호가 올바르지 않습니다.",
    });
  }

  await createAdminSession(c, adminUser);

  const responsePayload: AdminSessionPayload = {
    ok: true,
    admin: {
      loginId: adminUser.loginId,
      displayName: adminUser.displayName,
    },
  };

  return c.json(responsePayload);
});

app.get("/api/admin/me", async (c) => {
  c.header("Cache-Control", "no-store");

  const admin = await loadAdminProfile(c);

  const responsePayload: AdminSessionPayload = {
    ok: true,
    admin,
  };

  return c.json(responsePayload);
});

app.post("/api/admin/logout", async (c) => {
  assertAllowedAdminOrigin(c);
  c.header("Cache-Control", "no-store");
  clearAdminSession(c);

  return c.json({
    ok: true,
  });
});

app.get("/api/admin/dashboard", async (c) => {
  await loadAdminProfile(c);
  c.header("Cache-Control", "no-store");
  await ensureBootstrapContentData(c.env);

  const payload = await getAdminDashboard(c.env.DB);
  return c.json(payload);
});

app.put("/api/admin/settings/home", async (c) => {
  await loadAdminProfile(c);
  c.header("Cache-Control", "no-store");

  const payload = parseHomeSettingsPayload(await readJsonBody(c));
  await saveAdminHomeSettings(c.env.DB, payload);
  await bumpCacheVersion(c.env.CONTENT_CACHE);

  return c.json({
    ok: true,
    settings: payload,
  });
});

app.post("/api/admin/categories", async (c) => {
  await loadAdminProfile(c);
  c.header("Cache-Control", "no-store");

  const payload = parseCategoryPayload(await readJsonBody(c));
  const id = await createAdminCategory(c.env.DB, payload);
  await bumpCacheVersion(c.env.CONTENT_CACHE);

  return c.json({
    ok: true,
    id,
  });
});

app.put("/api/admin/categories/:id", async (c) => {
  await loadAdminProfile(c);
  c.header("Cache-Control", "no-store");

  const categoryId = parseIntegerField(c.req.param("id"), "카테고리 ID", {
    min: 1,
  }) as number;
  const payload = parseCategoryPayload(await readJsonBody(c));
  const updated = await updateAdminCategory(c.env.DB, categoryId, payload);

  if (!updated) {
    throw new HTTPException(404, {
      message: "수정할 카테고리를 찾을 수 없습니다.",
    });
  }

  await bumpCacheVersion(c.env.CONTENT_CACHE);

  return c.json({
    ok: true,
    id: categoryId,
  });
});

app.delete("/api/admin/categories/:id", async (c) => {
  await loadAdminProfile(c);
  c.header("Cache-Control", "no-store");

  const categoryId = parseIntegerField(c.req.param("id"), "카테고리 ID", {
    min: 1,
  }) as number;
  const result = await deleteAdminCategory(c.env.DB, categoryId);

  if (!result.ok) {
    if (result.reason === "not_found") {
      throw new HTTPException(404, {
        message: "삭제할 카테고리를 찾을 수 없습니다.",
      });
    }

    throw new HTTPException(409, {
      message: `해당 카테고리에 연결된 콘텐츠 ${result.linkedContentCount}개를 먼저 정리해 주세요.`,
    });
  }

  await bumpCacheVersion(c.env.CONTENT_CACHE);

  return c.json({
    ok: true,
    id: categoryId,
  });
});

app.post("/api/admin/contents", async (c) => {
  await loadAdminProfile(c);
  c.header("Cache-Control", "no-store");

  const payload = parseContentCreatePayload(await readJsonBody(c));
  const id = await createAdminContent(c.env.DB, payload);
  await bumpCacheVersion(c.env.CONTENT_CACHE);

  return c.json({
    ok: true,
    id,
  });
});

app.get("/api/admin/contents/:id", async (c) => {
  await loadAdminProfile(c);
  c.header("Cache-Control", "no-store");
  await ensureBootstrapContentData(c.env);

  const contentId = parseIntegerField(c.req.param("id"), "콘텐츠 ID", {
    min: 1,
  }) as number;
  const item = await getAdminContentDetail(c.env.DB, contentId);

  if (!item) {
    throw new HTTPException(404, {
      message: "상세 정보를 불러올 콘텐츠를 찾을 수 없습니다.",
    });
  }

  return c.json({
    item,
  });
});

app.put("/api/admin/contents/:id", async (c) => {
  await loadAdminProfile(c);
  c.header("Cache-Control", "no-store");

  const contentId = parseIntegerField(c.req.param("id"), "콘텐츠 ID", {
    min: 1,
  }) as number;
  const payload = parseContentPayload(await readJsonBody(c));
  const updated = await updateAdminContent(c.env.DB, contentId, payload);

  if (!updated) {
    throw new HTTPException(404, {
      message: "수정할 콘텐츠를 찾을 수 없습니다.",
    });
  }

  await bumpCacheVersion(c.env.CONTENT_CACHE);

  return c.json({
    ok: true,
    id: contentId,
  });
});

app.delete("/api/admin/contents/:id", async (c) => {
  await loadAdminProfile(c);
  c.header("Cache-Control", "no-store");

  const contentId = parseIntegerField(c.req.param("id"), "콘텐츠 ID", {
    min: 1,
  }) as number;
  const deleted = await deleteAdminContent(c.env.DB, contentId);

  if (!deleted) {
    throw new HTTPException(404, {
      message: "삭제할 콘텐츠를 찾을 수 없습니다.",
    });
  }

  await bumpCacheVersion(c.env.CONTENT_CACHE);

  return c.json({
    ok: true,
    id: contentId,
  });
});

app.post("/api/admin/contents/:id/sync-youtube", async (c) => {
  await loadAdminProfile(c);
  c.header("Cache-Control", "no-store");

  const contentId = parseIntegerField(c.req.param("id"), "콘텐츠 ID", {
    min: 1,
  }) as number;
  const item = await getAdminContentDetail(c.env.DB, contentId);

  if (!item) {
    throw new HTTPException(404, {
      message: "수집할 콘텐츠를 찾을 수 없습니다.",
    });
  }

  const result = await syncYoutubeReactions(c.env, {
    contentSlug: item.slug,
    limitPerKeyword: 5,
    maxContents: 1,
  });

  let rankingsRebuilt = false;

  if (result.updatedCount > 0) {
    await rebuildRankings(c.env.DB);
    await bumpCacheVersion(c.env.CONTENT_CACHE);
    rankingsRebuilt = true;
  }

  return c.json({
    ok: result.success,
    contentId,
    contentSlug: item.slug,
    rankingsRebuilt,
    result,
  });
});

app.post("/internal/sync/youtube", async (c) => {
  assertInternalToken(c);
  c.header("Cache-Control", "no-store");

  const contentSlug = c.req.query("contentSlug") ?? undefined;
  const maxContentsQuery = c.req.query("maxContents");
  const maxContents = maxContentsQuery ? clampLimit(maxContentsQuery, 12, 50) : undefined;
  const limitPerKeyword = clampLimit(c.req.query("limitPerKeyword"), 5, 10);
  const result = await syncYoutubeReactions(c.env, {
    contentSlug,
    maxContents,
    limitPerKeyword,
  });

  if (result.updatedCount > 0) {
    await rebuildRankings(c.env.DB);
    await bumpCacheVersion(c.env.CONTENT_CACHE);
  }

  const status = result.success ? 200 : 400;
  return c.json(result, status);
});

app.post("/internal/rankings/rebuild", async (c) => {
  assertInternalToken(c);
  c.header("Cache-Control", "no-store");

  const result = await rebuildRankings(c.env.DB);
  await bumpCacheVersion(c.env.CONTENT_CACHE);

  return c.json(result);
});

app.onError((error, c) => {
  const headers = createSecurityHeaderRecord();

  if (error instanceof HTTPException) {
    return c.json(
      {
        message: error.message,
      },
      error.status,
      headers,
    );
  }

  console.error(error);

  const normalizedMessage = error instanceof Error ? error.message : String(error);

  if (normalizedMessage.includes("UNIQUE constraint failed")) {
    return c.json(
      {
        message: "?대? 媛숈? ?앸퀎?먮? 媛吏??곗씠?곌? ?덉뼱 ??ν븯吏 紐삵뻽?듬땲??",
      },
      409,
      headers,
    );
  }

  return c.json(
    {
      message: "?덉긽?섏? 紐삵븳 ?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.",
    },
    500,
    headers,
  );
});

const worker: ExportedHandler<AppBindings["Bindings"]> = {
  fetch: app.fetch,
  scheduled: async (_controller, env, ctx) => {
    ctx.waitUntil(
      (async () => {
        const syncResult = await syncYoutubeReactions(env, {
          limitPerKeyword: 5,
        });
        const rankingResult = await rebuildRankings(env.DB);

        if (syncResult.updatedCount > 0 || rankingResult.updatedCount > 0) {
          await bumpCacheVersion(env.CONTENT_CACHE);
        }
      })(),
    );
  },
};

export default worker;
