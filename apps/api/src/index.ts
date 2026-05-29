import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";

import { clampLimit, clampPage, parseSort } from "./lib/pagination";
import {
  getCategories,
  getContentBySlug,
  getFeaturedReactionByContentSlug,
  getContentList,
  getHomePayload,
  getReactionsByContentSlug,
} from "./repositories/catalog-repository";
import { bumpCacheVersion, withCache } from "./services/cache-service";
import { rebuildRankings } from "./services/ranking-service";
import { syncYoutubeReactions } from "./services/youtube-sync-service";
import type { AppBindings } from "./types";

const app = new Hono<AppBindings>();

app.use("/api/*", cors());
app.use("/internal/*", cors());

const HOME_CACHE_TTL_SECONDS = 60 * 10;
const CONTENT_LIST_CACHE_TTL_SECONDS = 60 * 10;
const CONTENT_DETAIL_CACHE_TTL_SECONDS = 60 * 5;
const REACTION_LIST_CACHE_TTL_SECONDS = 60 * 5;

const assertInternalToken = (c: {
  env: AppBindings["Bindings"];
  req: {
    header: (name: string) => string | undefined;
  };
}) => {
  const expectedToken = c.env.INTERNAL_API_TOKEN;

  if (!expectedToken) {
    return;
  }

  const providedToken = c.req.header("Authorization")?.replace("Bearer ", "");

  if (providedToken !== expectedToken) {
    throw new HTTPException(401, {
      message: "내부 API 토큰이 유효하지 않습니다.",
    });
  }
};

const buildContentListCacheKey = (
  category: string | undefined,
  sort: string,
  page: number,
  limit: number,
) => `contents:${category ?? "all"}:${sort}:${page}:${limit}`;

app.get("/", (c) =>
  c.json({
    service: "awesomekorea-api",
    status: "ok",
    phase: ["1.1", "1.2", "1.3", "1.4", "1.5"],
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
  const categories = await getCategories(c.env.DB);

  return c.json({
    items: categories,
  });
});

app.get("/api/home", async (c) => {
  const payload = await withCache(c.env.CONTENT_CACHE, "home", HOME_CACHE_TTL_SECONDS, () =>
    getHomePayload(c.env.DB),
  );

  return c.json(payload);
});

app.get("/api/contents", async (c) => {
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
  const slug = c.req.param("slug");
  const payload = await withCache(
    c.env.CONTENT_CACHE,
    `content:${slug}`,
    CONTENT_DETAIL_CACHE_TTL_SECONDS,
    async () => {
      const content = await getContentBySlug(c.env.DB, slug);

      if (!content) {
        throw new HTTPException(404, {
          message: "콘텐츠를 찾을 수 없습니다.",
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
      message: "콘텐츠를 찾을 수 없습니다.",
    });
  }

  return c.json(payload);
});

app.get("/api/contents/:slug/reactions", async (c) => {
  const slug = c.req.param("slug");
  const content = await getContentBySlug(c.env.DB, slug);

  if (!content) {
    throw new HTTPException(404, {
      message: "콘텐츠를 찾을 수 없습니다.",
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

app.post("/internal/sync/youtube", async (c) => {
  assertInternalToken(c);

  const contentSlug = c.req.query("contentSlug") ?? undefined;
  const maxContents = clampLimit(c.req.query("maxContents"), 8, 20);
  const limitPerKeyword = clampLimit(c.req.query("limitPerKeyword"), 5, 10);
  const result = await syncYoutubeReactions(c.env, {
    contentSlug,
    maxContents,
    limitPerKeyword,
  });

  if (result.updatedCount > 0) {
    await bumpCacheVersion(c.env.CONTENT_CACHE);
  }

  const status = result.success ? 200 : 400;
  return c.json(result, status);
});

app.post("/internal/rankings/rebuild", async (c) => {
  assertInternalToken(c);

  const result = await rebuildRankings(c.env.DB);
  await bumpCacheVersion(c.env.CONTENT_CACHE);

  return c.json(result);
});

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    return c.json(
      {
        message: error.message,
      },
      error.status,
    );
  }

  console.error(error);

  return c.json(
    {
      message: "예상하지 못한 오류가 발생했습니다.",
    },
    500,
  );
});

const worker: ExportedHandler<AppBindings["Bindings"]> = {
  fetch: app.fetch,
  scheduled: async (_controller, env, ctx) => {
    ctx.waitUntil(
      (async () => {
        const syncResult = await syncYoutubeReactions(env, {
          maxContents: 8,
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
