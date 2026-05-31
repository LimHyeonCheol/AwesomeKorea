const CACHE_VERSION_KEY = "meta:cache-version";

const readCacheVersion = async (cache: KVNamespace) => {
  const currentVersion = await cache.get(CACHE_VERSION_KEY);

  if (currentVersion) {
    return currentVersion;
  }

  const initialVersion = "v1";
  await cache.put(CACHE_VERSION_KEY, initialVersion);

  return initialVersion;
};

const buildScopedKey = (version: string, key: string) => `${version}:${key}`;

export const withCache = async <T>(
  cache: KVNamespace,
  key: string,
  ttlSeconds: number,
  factory: () => Promise<T>,
): Promise<T> => {
  try {
    const version = await readCacheVersion(cache);
    const scopedKey = buildScopedKey(version, key);
    const cached = await cache.get(scopedKey, "json");

    if (cached) {
      return cached as T;
    }
  } catch {
    return await factory();
  }

  const payload = await factory();

  try {
    const version = await readCacheVersion(cache);
    const scopedKey = buildScopedKey(version, key);

    await cache.put(scopedKey, JSON.stringify(payload), {
      expirationTtl: ttlSeconds,
    });
  } catch {
    return payload;
  }

  return payload;
};

export const bumpCacheVersion = async (cache: KVNamespace) => {
  const nextVersion = new Date().toISOString();

  try {
    await cache.put(CACHE_VERSION_KEY, nextVersion);
  } catch {
    return nextVersion;
  }

  return nextVersion;
};
