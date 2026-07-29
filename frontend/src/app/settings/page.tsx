// X2.1 — /settings 404'd while nav labels say "Settings" (the real page
// lives at /account-settings). A typed or bookmarked /settings now lands
// on the real page instead of a dead end.
import { redirect } from 'next/navigation';

export default function SettingsRedirect() {
  redirect('/account-settings');
}
