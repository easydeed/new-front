import { redirect } from 'next/navigation';

// Legacy wizard entry route. DeedBuilder at /deed-builder/[type] is the
// canonical URL. This file used to mount WizardHost + manage draft-clearing
// on ?fresh=true; now it server-redirects, preserving both the docType slug
// and any query string so callers (e.g. ?fresh=true, ?mode=modern) keep the
// same URL shape on the new route.
interface PageProps {
  params: Promise<{ docType: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LegacyCreateDeedDocTypeRedirect({
  params,
  searchParams,
}: PageProps) {
  const { docType } = await params;
  const sp = await searchParams;

  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) qs.append(key, v);
    } else {
      qs.set(key, value);
    }
  }
  const query = qs.toString();

  redirect(`/deed-builder/${docType}${query ? `?${query}` : ''}`);
}
