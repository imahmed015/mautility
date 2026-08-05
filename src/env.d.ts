/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_WEB3FORMS_ACCESS_KEY: string;
  readonly PUBLIC_BOOKINGS_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
