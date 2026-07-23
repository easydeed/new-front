// Single source of truth for the partners proxies' backend origin.
// Bug #12a: the create proxy resolved NEXT_PUBLIC_API_URL while the
// selectlist proxy resolved BACKEND_BASE_URL first — with different env
// configs, a partner could be written to one backend and listed from
// another. Every partners proxy imports this constant now.
export const PARTNERS_BACKEND =
  process.env.BACKEND_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://deedpro-main-api.onrender.com';
