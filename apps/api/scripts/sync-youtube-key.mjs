import path from "node:path";

import { repoDir, syncLocalDevVars } from "./youtube-key-sync.mjs";

const { devVarsPath, source } = syncLocalDevVars();

console.log(
  `[api:key] YOUTUBE_API_KEY를 ${path.relative(repoDir, devVarsPath)} 에 동기화했습니다. (source: ${source})`,
);
