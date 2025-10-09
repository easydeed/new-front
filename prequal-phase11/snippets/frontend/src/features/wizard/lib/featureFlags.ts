// Phase 11 flags (safe defaults)
export const FEATURE_FLAGS = {
  EMBED_PDF_PREVIEW: process.env.NEXT_PUBLIC_WIZARD_EMBED_PDF_PREVIEW !== 'false',
  REQUIRE_FINALIZE: process.env.NEXT_PUBLIC_WIZARD_REQUIRE_FINALIZE !== 'false',
};
