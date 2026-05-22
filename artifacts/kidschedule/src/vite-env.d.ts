/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STATIC_AUDIO_STRICT_MODE?: string;
  readonly VITE_APP_API_ORIGIN?: string;
  readonly VITE_AMYNEST_CAPACITOR_IOS_BUILD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
