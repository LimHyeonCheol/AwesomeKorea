export interface AppBindings {
  Bindings: {
    APP_ENV?: string;
    CONTENT_CACHE: KVNamespace;
    DB: D1Database;
    INTERNAL_API_TOKEN?: string;
    YOUTUBE_API_KEY?: string;
  };
}
