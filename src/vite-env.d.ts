/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LOZANA_API_URL: string;
  readonly VITE_LOZANA_WS_URL: string;
  readonly VITE_CORTEX_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_LOZA_API_KEY: string;
  readonly VITE_LOZANA_ALLOWED_ORIGINS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
