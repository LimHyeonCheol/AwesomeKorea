const mode = process.argv[2];

const ensure = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const readText = async (response, label) => {
  const text = await response.text();

  ensure(
    response.ok,
    `${label} 요청이 실패했습니다. (${response.status}) ${text.slice(0, 400)}`,
  );

  return text;
};

const readJson = async (response, label) => {
  const text = await readText(response, label);

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} 응답이 JSON 형식이 아닙니다. ${String(error)}`);
  }
};

const normalizeBaseUrl = (value, envKey) => {
  ensure(value, `${envKey} 환경 변수가 필요합니다.`);
  return value.replace(/\/$/, "");
};

const smokeApi = async () => {
  const apiBaseUrl = normalizeBaseUrl(process.env.SMOKE_API_BASE_URL, "SMOKE_API_BASE_URL");
  const internalApiToken = process.env.SMOKE_INTERNAL_API_TOKEN?.trim() ?? "";

  const health = await readJson(await fetch(`${apiBaseUrl}/api/health`), "API health");
  ensure(health.status === "ok", "API health 응답의 status 값이 ok가 아닙니다.");

  const home = await readJson(await fetch(`${apiBaseUrl}/api/home`), "API home");
  ensure(Array.isArray(home.top10), "API home.top10 형식이 올바르지 않습니다.");
  ensure(Array.isArray(home.popularByCategory), "API home.popularByCategory 형식이 올바르지 않습니다.");

  const contents = await readJson(
    await fetch(`${apiBaseUrl}/api/contents?sort=popular&page=1&limit=4`),
    "API contents",
  );
  ensure(Array.isArray(contents.items), "API contents.items 형식이 올바르지 않습니다.");

  if (internalApiToken) {
    const rebuild = await readJson(
      await fetch(`${apiBaseUrl}/internal/rankings/rebuild`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${internalApiToken}`,
        },
      }),
      "API internal rankings rebuild",
    );

    ensure(rebuild.success === true, "내부 rankings rebuild 응답이 success=true 가 아닙니다.");
  }

  console.log(
    JSON.stringify(
      {
        mode: "api",
        apiBaseUrl,
        hasTop10: home.top10.length > 0,
        hasContents: contents.items.length > 0,
      },
      null,
      2,
    ),
  );
};

const smokeWeb = async () => {
  const webBaseUrl = normalizeBaseUrl(process.env.SMOKE_WEB_BASE_URL, "SMOKE_WEB_BASE_URL");
  const expectedApiBaseUrl = process.env.SMOKE_EXPECTED_API_BASE_URL?.trim() ?? "";
  const appRoute = `${webBaseUrl}/content/extreme-job`;

  const rootHtml = await readText(await fetch(webBaseUrl), "Web root");
  ensure(rootHtml.includes('<div id="root"></div>'), "메인 페이지가 SPA root를 포함하지 않습니다.");

  const assetMatch = rootHtml.match(/src="([^"]*assets\/[^"]+\.js)"/);
  ensure(assetMatch?.[1], "메인 페이지에서 JS asset 경로를 찾지 못했습니다.");

  const assetUrl = new URL(assetMatch[1], `${webBaseUrl}/`).toString();
  const assetJs = await readText(await fetch(assetUrl), "Web asset");

  if (expectedApiBaseUrl) {
    ensure(
      assetJs.includes(expectedApiBaseUrl),
      "배포된 웹 asset 안에 기대한 API base URL 이 포함되지 않았습니다.",
    );
  }

  const routeHtml = await readText(await fetch(appRoute), "Web content route");
  ensure(routeHtml.includes('<div id="root"></div>'), "직접 진입 라우트가 SPA fallback을 반환하지 않습니다.");

  console.log(
    JSON.stringify(
      {
        mode: "web",
        webBaseUrl,
        appRoute,
        assetUrl,
      },
      null,
      2,
    ),
  );
};

const main = async () => {
  ensure(mode === "api" || mode === "web", "사용법: node scripts/smoke-deploy.mjs <api|web>");

  if (mode === "api") {
    await smokeApi();
    return;
  }

  await smokeWeb();
};

await main();
