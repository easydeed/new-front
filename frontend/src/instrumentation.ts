/**
 * The site's boot check — the frontend's answer to `check_environment()`.
 *
 * Next.js calls `register()` once when the server starts, which is the
 * only moment in this app's life that corresponds to the API's boot. The
 * owner's ruling on the missing contact block was to "surface it the way
 * the boot check surfaces a missing required variable", and this is that
 * surface: an unmissable block in the deploy log, and a refusal to start
 * under `STRICT_PUBLIC_ENV=1`.
 *
 * WHAT IT IS REPORTING is the BUILD, not the running environment.
 * `NEXT_PUBLIC_*` values are substituted into the bundle at build time
 * (see `lib/publicEnvironment.ts`), so a variable added to the service
 * afterwards does not reach a visitor until a rebuild. The report says so
 * in its own text, because "I set it and nothing changed" is the next
 * thing that would otherwise happen.
 */
import { checkPublicEnv } from './lib/publicEnvironment';

export function register() {
  checkPublicEnv();
}
