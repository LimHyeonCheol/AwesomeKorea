import { countValidReactionVideos } from "../repositories/catalog-repository";
import { bumpCacheVersion } from "./cache-service";
import { rebuildRankings } from "./ranking-service";
import { syncYoutubeReactions } from "./youtube-sync-service";
import type { AppBindings } from "../types";

const BOOTSTRAP_ATTEMPT_KEY = "meta:youtube-bootstrap-attempted";
const BOOTSTRAP_ATTEMPT_TTL_SECONDS = 60 * 30;

const shouldSkipBootstrap = async (cache: KVNamespace) => {
  try {
    return Boolean(await cache.get(BOOTSTRAP_ATTEMPT_KEY));
  } catch {
    return false;
  }
};

const markBootstrapAttempt = async (cache: KVNamespace) => {
  try {
    await cache.put(BOOTSTRAP_ATTEMPT_KEY, new Date().toISOString(), {
      expirationTtl: BOOTSTRAP_ATTEMPT_TTL_SECONDS,
    });
  } catch {
    // Ignore KV issues so public API requests can continue.
  }
};

export const ensureBootstrapContentData = async (env: AppBindings["Bindings"]) => {
  if (!env.YOUTUBE_API_KEY) {
    return false;
  }

  const validReactionCount = await countValidReactionVideos(env.DB);

  if (validReactionCount > 0) {
    return false;
  }

  if (await shouldSkipBootstrap(env.CONTENT_CACHE)) {
    return false;
  }

  await markBootstrapAttempt(env.CONTENT_CACHE);

  const syncResult = await syncYoutubeReactions(env, {
    limitPerKeyword: 5,
  });

  if (syncResult.updatedCount === 0) {
    return false;
  }

  await rebuildRankings(env.DB);
  await bumpCacheVersion(env.CONTENT_CACHE);

  return true;
};
