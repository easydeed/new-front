import { redirect } from 'next/navigation';

// Legacy picker route. DeedBuilder at /deed-builder is the canonical entry.
// This file used to render a deed-type picker that mounted the 5-step wizard;
// now it server-redirects to the new picker so any bookmarks or external
// links continue to work. Safe to delete once we're confident no traffic
// hits /create-deed.
export default function LegacyCreateDeedRedirect() {
  redirect('/deed-builder');
}
