import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * PATCH4: Preserve `?mode=modern` on wizard preview + deed routes by reading
 * the 'wizard-mode' cookie set by ModeCookieSync.
 *
 * Safe: Only rewrites when cookie=modern and query param missing.
 */
export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const pathname = url.pathname;
  const modeCookie = req.cookies.get('wizard-mode')?.value;

  const wantsModern = modeCookie === 'modern';
  const hasModeParam = url.searchParams.has('mode');

  const isPreview = /^\/deeds\/[\w-]+\/preview$/.test(pathname);
  const isWizardRoot = /^(?:\/grant-deed|\/quitclaim|\/interspousal-transfer|\/warranty-deed|\/tax-deed)$/.test(pathname);

  if (wantsModern && (isPreview || isWizardRoot) && !hasModeParam) {
    url.searchParams.set('mode', 'modern');
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/deeds/:id/preview',
    '/grant-deed',
    '/quitclaim',
    '/interspousal-transfer',
    '/warranty-deed',
    '/tax-deed',
  ],
};
