/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LOZANA_API_URL: string;
  readonly VITE_LOZANA_WS_URL: string;
  readonly VITE_LOZA_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
