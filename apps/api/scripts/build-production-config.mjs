import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { appDir } from "./youtube-key-sync.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const baseConfigPath = path.resolve(scriptDir, "..", "wrangler.jsonc");
const outputDir = path.join(appDir, ".wrangler");
const outputPath = path.join(outputDir, "deploy.production.jsonc");
const repoNodeModulesPath = path.resolve(appDir, "..", "..", "node_modules", "wrangler", "config-schema.json");
const workerEntryPath = path.resolve(appDir, "src", "index.ts");

const requireEnvValue = (key, fallback = "") => {
  const value = process.env[key]?.trim() ?? fallback;

  if (!value) {
    throw new Error(`${key} 환경 변수가 필요합니다.`);
  }

  return value;
};

export const buildProductionConfig = () => {
  const baseConfig = JSON.parse(fs.readFileSync(baseConfigPath, "utf8"));
  const databaseId = requireEnvValue("CLOUDFLARE_D1_ID");
  const previewDatabaseId = process.env.CLOUDFLARE_D1_PREVIEW_ID?.trim() || databaseId;
  const kvNamespaceId = requireEnvValue("CLOUDFLARE_KV_ID");
  const previewKvNamespaceId = process.env.CLOUDFLARE_KV_PREVIEW_ID?.trim() || kvNamespaceId;
  const databaseName =
    process.env.CLOUDFLARE_D1_NAME?.trim() ||
    baseConfig.d1_databases?.[0]?.database_name ||
    "awesome-korea";

  const nextConfig = {
    ...baseConfig,
    $schema: path.relative(outputDir, repoNodeModulesPath).replace(/\\/g, "/"),
    main: path.relative(outputDir, workerEntryPath).replace(/\\/g, "/"),
    vars: {
      ...(baseConfig.vars ?? {}),
      APP_ENV: "production",
    },
    d1_databases: [
      {
        ...(baseConfig.d1_databases?.[0] ?? {}),
        binding: "DB",
        database_id: databaseId,
        database_name: databaseName,
        preview_database_id: previewDatabaseId,
      },
    ],
    kv_namespaces: [
      {
        ...(baseConfig.kv_namespaces?.[0] ?? {}),
        binding: "CONTENT_CACHE",
        id: kvNamespaceId,
        preview_id: previewKvNamespaceId,
      },
    ],
  };

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(nextConfig, null, 2)}\n`, "utf8");

  return {
    configPath: outputPath,
    databaseId,
    kvNamespaceId,
  };
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { configPath, databaseId, kvNamespaceId } = buildProductionConfig();

  console.log(`[deploy:config] 프로덕션 설정 파일을 생성했습니다: ${configPath}`);
  console.log(`[deploy:config] D1 database_id: ${databaseId}`);
  console.log(`[deploy:config] KV namespace id: ${kvNamespaceId}`);
}
