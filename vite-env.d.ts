/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LOXANA_API_URL: string;
  readonly VITE_LOXANA_WS_URL: string;
  readonly VITE_LOXA_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
