import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  appDir,
  syncAdminAllowedOriginsSecret,
  syncAdminSessionSecret,
  syncInternalApiTokenSecret,
  syncOptionalTranslationSecrets,
  syncCloudflareSecret,
  syncLocalDevVars,
  wranglerPath,
} from "./youtube-key-sync.mjs";
import { buildProductionConfig } from "./build-production-config.mjs";

const { source } = syncLocalDevVars();

console.log(`[deploy:api] 로컬 개발용 YOUTUBE_API_KEY를 동기화했습니다. (source: ${source})`);
console.log("[deploy:api] Cloudflare Worker secret 을 동기화합니다.");

const youtubeSecret = syncCloudflareSecret();
const internalTokenSecret = syncInternalApiTokenSecret();
const adminSessionSecret = syncAdminSessionSecret();
const adminAllowedOrigins = syncAdminAllowedOriginsSecret();
const translationSecrets = syncOptionalTranslationSecrets();
const { configPath } = buildProductionConfig();

const translationSecretSummary =
  translationSecrets.length > 0
    ? translationSecrets.map((secret) => `${secret.key}(${secret.source})`).join(", ")
    : null;

if (translationSecretSummary) {
  console.log(`[deploy:api] Optional translation secrets synced: ${translationSecretSummary}`);
} else {
  console.log(
    "[deploy:api] No optional translation secrets were provided. Translation fallback will keep original text where needed.",
  );
}

console.log(`[deploy:api] YOUTUBE_API_KEY secret 동기화 완료. (source: ${youtubeSecret.source})`);
console.log(
  `[deploy:api] INTERNAL_API_TOKEN secret 동기화 완료. (source: ${internalTokenSecret.source})`,
);
console.log(
  `[deploy:api] ADMIN_SESSION_SECRET secret 동기화 완료. (source: ${adminSessionSecret.source})`,
);
if (adminAllowedOrigins) {
  console.log(
    `[deploy:api] ADMIN_ALLOWED_ORIGINS 동기화 완료. (${adminAllowedOrigins.value})`,
  );
} else {
  console.log(
    "[deploy:api] ADMIN_ALLOWED_ORIGINS 가 비어 있습니다. same-origin 또는 로컬 개발 origin 만 관리자 접근이 허용됩니다.",
  );
}
console.log(
  `[deploy:api] Cloudflare 프로덕션 설정 파일 생성 완료. (${path.relative(appDir, configPath)})`,
);
console.log("[deploy:api] D1 마이그레이션을 원격 데이터베이스에 적용합니다.");

const migrationResult = spawnSync(
  process.execPath,
  [
    wranglerPath,
    "d1",
    "migrations",
    "apply",
    "awesome-korea",
    "--remote",
    "--config",
    configPath,
  ],
  {
    cwd: appDir,
    encoding: "utf8",
  },
);

if (migrationResult.stdout) {
  process.stdout.write(migrationResult.stdout);
}

if (migrationResult.stderr) {
  process.stderr.write(migrationResult.stderr);
}

if ((migrationResult.status ?? 0) !== 0) {
  process.exit(migrationResult.status ?? 1);
}

console.log("[deploy:api] awesomekorea-api 배포를 시작합니다.");

const result = spawnSync(
  process.execPath,
  [wranglerPath, "deploy", "--config", configPath, ...process.argv.slice(2)],
  {
    cwd: appDir,
    encoding: "utf8",
  },
);

if (result.stdout) {
  process.stdout.write(result.stdout);
}

if (result.stderr) {
  process.stderr.write(result.stderr);
}

process.exit(result.status ?? 0);
