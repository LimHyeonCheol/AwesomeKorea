export interface AppBindings {
  Bindings: {
    APP_ENV?: string;
    CONTENT_CACHE: KVNamespace;
    DB: D1Database;
    DEEPL_API_KEY?: string;
    DEEPL_API_URL?: string;
    GOOGLE_TRANSLATE_API_KEY?: string;
    INTERNAL_API_TOKEN?: string;
    PAPAGO_CLIENT_ID?: string;
    PAPAGO_CLIENT_SECRET?: string;
    TRANSLATION_PROVIDER?: string;
    YOUTUBE_API_KEY?: string;
  };
}
