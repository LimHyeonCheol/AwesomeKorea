import { readFileSync } from "node:fs";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const LOCAL_API_PROXY_TARGET =
  process.env.AWESOMEKOREA_API_PROXY_TARGET ?? "http://127.0.0.1:9000";
const LOCAL_API_PROXY_TIMEOUT_MS = 8_000;
const webPackage = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as { version?: string };
const packageVersion = webPackage.version?.trim() || "0.1.0";
const commitSha = (process.env.CF_PAGES_COMMIT_SHA ?? process.env.GITHUB_SHA ?? "").trim();
const branchName = (
  process.env.CF_PAGES_BRANCH ??
  process.env.GITHUB_REF_NAME ??
  process.env.AWESOMEKOREA_PAGES_BRANCH ??
  ""
).trim();
const deployVersion = commitSha
  ? `v${packageVersion}+${commitSha.slice(0, 7)}`
  : branchName
    ? `v${packageVersion}-${branchName}`
    : `v${packageVersion}`;

export default defineConfig({
  define: {
    __APP_DEPLOY_VERSION__: JSON.stringify(deployVersion),
  },
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: LOCAL_API_PROXY_TARGET,
        proxyTimeout: LOCAL_API_PROXY_TIMEOUT_MS,
        timeout: LOCAL_API_PROXY_TIMEOUT_MS,
      },
      "/internal": {
        target: LOCAL_API_PROXY_TARGET,
        proxyTimeout: LOCAL_API_PROXY_TIMEOUT_MS,
        timeout: LOCAL_API_PROXY_TIMEOUT_MS,
      },
    },
  },
});
