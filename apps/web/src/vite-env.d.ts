/// <reference types="vite/client" />

declare const __APP_DEPLOY_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_ENABLE_DEV_PREVIEW?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
