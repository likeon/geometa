// Defaults to production. `npm run dev:local` (and any other development-mode
// build) picks up the overrides in .env.development, which vite never loads for
// a production `npm run build`.
export const API_BASE_URL = import.meta.env.VITE_GEOMETA_API_URL ?? 'https://learnablemeta.com';
export const SITE_BASE_URL = import.meta.env.VITE_GEOMETA_SITE_URL ?? 'https://learnablemeta.com';
