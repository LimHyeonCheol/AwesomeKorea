import { spawnSync } from "node:child_process";

import { appDir, wranglerPath } from "./youtube-key-sync.mjs";

const result = spawnSync(
  process.execPath,
  [
    wranglerPath,
    "d1",
    "migrations",
    "apply",
    "awesome-korea",
    "--local",
    "--persist-to",
    ".wrangler/state/v3",
    "--config",
    "wrangler.jsonc",
  ],
  {
    cwd: appDir,
    stdio: "inherit",
  },
);

process.exit(result.status ?? 0);
