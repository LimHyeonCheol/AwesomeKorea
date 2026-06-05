import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { syncLocalDevVars } from "./youtube-key-sync.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(scriptDir, "..");
const repoDir = path.resolve(appDir, "..", "..");
const localApiPort = "9000";
const localPersistPath = ".wrangler/state/v3";
const wranglerPath = path.join(repoDir, "node_modules", "wrangler", "bin", "wrangler.js");
const wranglerMigrationArgs = [
  "d1",
  "migrations",
  "apply",
  "awesome-korea",
  "--config",
  "wrangler.jsonc",
  "--local",
  "--persist-to",
  localPersistPath,
];
const wranglerBaseArgs = [
  "d1",
  "execute",
  "awesome-korea",
  "--config",
  "wrangler.jsonc",
  "--local",
    "--persist-to",
    localPersistPath,
];

const runWrangler = (args, options = {}) => {
  const result = spawnSync(process.execPath, [wranglerPath, ...args], {
    cwd: appDir,
    encoding: "utf8",
    stdio: options.captureOutput ? "pipe" : "inherit",
  });

  if (result.status !== 0) {
    if (options.captureOutput) {
      if (result.stdout) {
        process.stdout.write(result.stdout);
      }

      if (result.stderr) {
        process.stderr.write(result.stderr);
      }
    }

    process.exit(result.status ?? 1);
  }

  return result.stdout ?? "";
};

const runWranglerJson = (args) => {
  const output = runWrangler([...args, "--json"], { captureOutput: true }).trim();

  return output ? JSON.parse(output) : [];
};

const readScalar = (query, key) => {
  const [payload] = runWranglerJson([...wranglerBaseArgs, "--command", query]);
  return Number(payload?.results?.[0]?.[key] ?? 0);
};

const log = (message) => {
  console.log(`[dev:api] ${message}`);
};

const { source } = syncLocalDevVars();
log(`YOUTUBE_API_KEY 를 ${source} 기준으로 .dev.vars 에 동기화했습니다.`);

const ensureLocalDatabase = () => {
  log("로컬 D1 마이그레이션을 확인합니다.");
  runWrangler(wranglerMigrationArgs);

  const contentCount = readScalar("SELECT COUNT(*) AS total FROM contents", "total");

  if (contentCount === 0) {
    log("로컬 D1 시드 데이터를 채웁니다.");
    runWrangler([...wranglerBaseArgs, "--file", "./seeds/seed.sql"]);
    return;
  }

  log(`로컬 D1에 기존 콘텐츠 ${contentCount}건이 있어 시드를 유지합니다.`);
};

ensureLocalDatabase();

const devProcess = spawn(
  process.execPath,
  [
    wranglerPath,
    "dev",
    "--config",
    "wrangler.jsonc",
    "--local",
    "--persist-to",
    localPersistPath,
    "--port",
    localApiPort,
    ...process.argv.slice(2),
  ],
  {
    cwd: appDir,
    stdio: "inherit",
  },
);

devProcess.on("exit", (code) => {
  process.exit(code ?? 0);
});

devProcess.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
