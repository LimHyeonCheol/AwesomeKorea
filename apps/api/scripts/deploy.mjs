import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  appDir,
  syncInternalApiTokenSecret,
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
const { configPath } = buildProductionConfig();

console.log(`[deploy:api] YOUTUBE_API_KEY secret 동기화 완료. (source: ${youtubeSecret.source})`);
console.log(
  `[deploy:api] INTERNAL_API_TOKEN secret 동기화 완료. (source: ${internalTokenSecret.source})`,
);
console.log(
  `[deploy:api] Cloudflare 프로덕션 설정 파일 생성 완료. (${path.relative(appDir, configPath)})`,
);
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
