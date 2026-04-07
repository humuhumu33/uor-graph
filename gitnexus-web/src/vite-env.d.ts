/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** When `"1"`, do not load `public/uor-hosted/` (used for Playwright E2E against local `gitnexus serve`). */
  readonly VITE_DISABLE_HOSTED_GRAPH?: string;
}
