import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

export const appDir = path.resolve(scriptDir, "..");
export const repoDir = path.resolve(appDir, "..", "..");
export const wranglerPath = path.join(repoDir, "node_modules", "wrangler", "bin", "wrangler.js");

const DEFAULT_KEY_FILE_CANDIDATES = [
  "apikey.txt",
  "docs/apikey.txt",
  "apps/api/apikey.txt",
];

const DEV_VARS_PATH = path.join(appDir, ".dev.vars");
const OPTIONAL_TRANSLATION_SECRET_KEYS = [
  "TRANSLATION_PROVIDER",
  "PAPAGO_CLIENT_ID",
  "PAPAGO_CLIENT_SECRET",
  "DEEPL_API_KEY",
  "DEEPL_API_URL",
  "GOOGLE_TRANSLATE_API_KEY",
];

const stripWrappingQuotes = (value) => {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
};

const extractApiKey = (rawValue) => {
  const envLine = rawValue.match(/^\s*YOUTUBE_API_KEY\s*=\s*(.+)\s*$/m);

  if (envLine) {
    return stripWrappingQuotes(envLine[1].trim());
  }

  const firstMeaningfulLine = rawValue
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !line.startsWith("#"));

  return firstMeaningfulLine ?? "";
};

const resolveKeyCandidates = () => {
  const candidates = [];

  if (process.env.YOUTUBE_API_KEY_FILE) {
    candidates.push(
      path.isAbsolute(process.env.YOUTUBE_API_KEY_FILE)
        ? process.env.YOUTUBE_API_KEY_FILE
        : path.resolve(repoDir, process.env.YOUTUBE_API_KEY_FILE),
    );
  }

  for (const relativePath of DEFAULT_KEY_FILE_CANDIDATES) {
    candidates.push(path.resolve(repoDir, relativePath));
  }

  return [...new Set(candidates)];
};

const readEnvVar = (content, key) => {
  const envLine = content.match(new RegExp(`^\\s*${key}\\s*=\\s*(.+)\\s*$`, "m"));

  if (!envLine) {
    return "";
  }

  return stripWrappingQuotes(envLine[1].trim());
};

export const upsertEnvVar = (content, key, value) => {
  const lines = content.length > 0 ? content.replace(/\r\n/g, "\n").split("\n") : [];
  let updated = false;
  const nextLines = lines.map((line) => {
    if (line.startsWith(`${key}=`)) {
      updated = true;
      return `${key}=${value}`;
    }

    return line;
  });

  if (!updated) {
    nextLines.push(`${key}=${value}`);
  }

  const normalizedLines = nextLines.filter((line, index, array) => {
    const isLastLine = index === array.length - 1;
    return !(isLastLine && line === "");
  });

  return `${normalizedLines.join("\n")}\n`;
};

export const loadYoutubeApiKey = () => {
  const envApiKey = process.env.YOUTUBE_API_KEY?.trim();

  if (envApiKey) {
    return {
      apiKey: envApiKey,
      source: "process.env.YOUTUBE_API_KEY",
    };
  }

  for (const candidatePath of resolveKeyCandidates()) {
    if (!fs.existsSync(candidatePath)) {
      continue;
    }

    const apiKey = extractApiKey(fs.readFileSync(candidatePath, "utf8"));

    if (apiKey) {
      return {
        apiKey,
        source: path.relative(repoDir, candidatePath) || candidatePath,
      };
    }
  }

  throw new Error(
    [
      "YOUTUBE_API_KEY를 찾지 못했습니다.",
      "다음 중 하나를 준비해 주세요:",
      "- 환경변수 YOUTUBE_API_KEY",
      "- 환경변수 YOUTUBE_API_KEY_FILE",
      "- 저장소 루트 apikey.txt",
      "- docs/apikey.txt",
    ].join("\n"),
  );
};

export const syncLocalDevVars = () => {
  const { apiKey, source } = loadYoutubeApiKey();
  const devVarsPath = DEV_VARS_PATH;
  const currentContent = fs.existsSync(devVarsPath) ? fs.readFileSync(devVarsPath, "utf8") : "";
  const nextContent = upsertEnvVar(currentContent, "YOUTUBE_API_KEY", apiKey);

  fs.writeFileSync(devVarsPath, nextContent, "utf8");

  return {
    devVarsPath,
    source,
  };
};

export const loadInternalApiToken = () => {
  const envToken = process.env.INTERNAL_API_TOKEN?.trim();

  if (envToken) {
    return {
      source: "process.env.INTERNAL_API_TOKEN",
      token: envToken,
    };
  }

  const currentContent = fs.existsSync(DEV_VARS_PATH) ? fs.readFileSync(DEV_VARS_PATH, "utf8") : "";
  const existingToken = readEnvVar(currentContent, "INTERNAL_API_TOKEN");

  if (existingToken) {
    return {
      source: path.relative(repoDir, DEV_VARS_PATH) || DEV_VARS_PATH,
      token: existingToken,
    };
  }

  const generatedToken = randomBytes(24).toString("base64url");
  const nextContent = upsertEnvVar(currentContent, "INTERNAL_API_TOKEN", generatedToken);

  fs.writeFileSync(DEV_VARS_PATH, nextContent, "utf8");

  return {
    source: `generated:${path.relative(repoDir, DEV_VARS_PATH) || DEV_VARS_PATH}`,
    token: generatedToken,
  };
};

export const loadAdminSessionSecret = () => {
  const envSecret = process.env.ADMIN_SESSION_SECRET?.trim();

  if (envSecret) {
    return {
      secret: envSecret,
      source: "process.env.ADMIN_SESSION_SECRET",
    };
  }

  const currentContent = fs.existsSync(DEV_VARS_PATH) ? fs.readFileSync(DEV_VARS_PATH, "utf8") : "";
  const existingSecret = readEnvVar(currentContent, "ADMIN_SESSION_SECRET");

  if (existingSecret) {
    return {
      secret: existingSecret,
      source: path.relative(repoDir, DEV_VARS_PATH) || DEV_VARS_PATH,
    };
  }

  const generatedSecret = randomBytes(32).toString("base64url");
  const nextContent = upsertEnvVar(currentContent, "ADMIN_SESSION_SECRET", generatedSecret);

  fs.writeFileSync(DEV_VARS_PATH, nextContent, "utf8");

  return {
    secret: generatedSecret,
    source: `generated:${path.relative(repoDir, DEV_VARS_PATH) || DEV_VARS_PATH}`,
  };
};

export const loadAdminAllowedOrigins = () => {
  const envOrigins = process.env.ADMIN_ALLOWED_ORIGINS?.trim();

  if (envOrigins) {
    return {
      source: "process.env.ADMIN_ALLOWED_ORIGINS",
      value: envOrigins,
    };
  }

  const currentContent = fs.existsSync(DEV_VARS_PATH) ? fs.readFileSync(DEV_VARS_PATH, "utf8") : "";
  const existingOrigins = readEnvVar(currentContent, "ADMIN_ALLOWED_ORIGINS");

  if (existingOrigins) {
    return {
      source: path.relative(repoDir, DEV_VARS_PATH) || DEV_VARS_PATH,
      value: existingOrigins,
    };
  }

  const pagesProject = process.env.AWESOMEKOREA_PAGES_PROJECT?.trim();

  if (pagesProject) {
    return {
      source: "derived:AWESOMEKOREA_PAGES_PROJECT",
      value: `https://${pagesProject}.pages.dev`,
    };
  }

  return null;
};

const putCloudflareSecret = (key, value) => {
  const result = spawnSync(
    process.execPath,
    [wranglerPath, "secret", "put", key, "--config", "wrangler.jsonc"],
    {
      cwd: appDir,
      stdio: ["pipe", "inherit", "inherit"],
      input: `${value}\n`,
    },
  );

  if (result.status !== 0) {
    throw new Error(`Cloudflare secret 동기화에 실패했습니다. (${key})`);
  }
};

export const syncCloudflareSecret = () => {
  const { apiKey, source } = loadYoutubeApiKey();

  putCloudflareSecret("YOUTUBE_API_KEY", apiKey);

  return {
    source,
  };
};

export const syncInternalApiTokenSecret = () => {
  const { source, token } = loadInternalApiToken();

  putCloudflareSecret("INTERNAL_API_TOKEN", token);

  return {
    source,
  };
};

export const syncAdminSessionSecret = () => {
  const { secret, source } = loadAdminSessionSecret();

  putCloudflareSecret("ADMIN_SESSION_SECRET", secret);

  return {
    source,
  };
};

export const syncAdminAllowedOriginsSecret = () => {
  const loaded = loadAdminAllowedOrigins();

  if (!loaded) {
    return null;
  }

  putCloudflareSecret("ADMIN_ALLOWED_ORIGINS", loaded.value);

  return {
    source: loaded.source,
    value: loaded.value,
  };
};

const loadOptionalEnvVar = (key) => {
  const envValue = process.env[key]?.trim();

  if (envValue) {
    return {
      source: `process.env.${key}`,
      value: envValue,
    };
  }

  const currentContent = fs.existsSync(DEV_VARS_PATH) ? fs.readFileSync(DEV_VARS_PATH, "utf8") : "";
  const existingValue = readEnvVar(currentContent, key);

  if (existingValue) {
    return {
      source: path.relative(repoDir, DEV_VARS_PATH) || DEV_VARS_PATH,
      value: existingValue,
    };
  }

  return null;
};

export const syncOptionalTranslationSecrets = () => {
  const synced = [];

  for (const key of OPTIONAL_TRANSLATION_SECRET_KEYS) {
    const loaded = loadOptionalEnvVar(key);

    if (!loaded) {
      continue;
    }

    putCloudflareSecret(key, loaded.value);
    synced.push({
      key,
      source: loaded.source,
    });
  }

  return synced;
};
