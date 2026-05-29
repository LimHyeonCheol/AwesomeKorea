import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";

import { clampLimit, clampPage, parseSort } from "./lib/pagination";
import {
  getCategories,
  getContentBySlug,
  getContentList,
  getHomePayload,
  getReactionsByContentSlug,
} from "./repositories/catalog-repository";
import type { AppBindings } from "./types";

const app = new Hono<AppBindings>();

app.use("/api/*", cors());

app.get("/", (c) =>
  c.json({
    service: "awesomekorea-api",
    status: "ok",
    phase: ["1.1", "1.2"],
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
  const payload = await getHomePayload(c.env.DB);

  return c.json(payload);
});

app.get("/api/contents", async (c) => {
  const category = c.req.query("category");
  const sort = parseSort(c.req.query("sort"));
  const page = clampPage(c.req.query("page"));
  const limit = clampLimit(c.req.query("limit"));

  const payload = await getContentList(c.env.DB, {
    category,
    sort,
    page,
    limit,
  });

  return c.json(payload);
});

app.get("/api/contents/:slug", async (c) => {
  const slug = c.req.param("slug");
  const payload = await getContentBySlug(c.env.DB, slug);

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
  const payload = await getReactionsByContentSlug(c.env.DB, {
    slug,
    sort,
    page,
    limit,
  });

  return c.json({
    content: {
      slug: content.slug,
      titleKo: content.titleKo,
      categoryNameKo: content.categoryNameKo,
    },
    ...payload,
  });
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

export default app;
