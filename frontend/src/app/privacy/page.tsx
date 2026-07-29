// HM3 — Privacy Policy scaffold. Standard SaaS structure, clearly marked
// DRAFT pending owner/counsel review. The footer links here so /privacy
// never 404s; the content is owner-gated.
export const metadata = {
  title: 'Privacy Policy — DeedPro',
};

const SECTIONS: Array<[string, string]> = [
  ['1. What We Collect', 'Account information (name, email, company), the property and party information you enter to prepare documents, and standard usage logs (IP address, browser, timestamps).'],
  ['2. How We Use It', 'To operate the service: preparing the documents you request, pulling the county records you ask for, securing accounts, and improving the product. We do not sell personal information.'],
  ['3. Documents', 'Deed documents you generate are stored with a cryptographic fingerprint so their integrity can be verified. Completed documents are retained immutably as part of the record you create.'],
  ['4. Third-Party Services', 'Document preparation may query property-data providers (county records) and, for paid plans, our payment processor. Each receives only what its function requires.'],
  ['5. Retention', 'Account data is kept while your account is active. Document records are retained as described in the Terms. You may request deletion of your account data, subject to records we are required to keep.'],
  ['6. Security', 'Sessions are token-based, transport is encrypted, and stored PDFs are hash-stamped at generation time.'],
  ['7. Your Rights', 'California residents may request access to or deletion of their personal information. Contact details pending — see the site footer.'],
  ['8. Changes', 'We may update this policy; material changes will be posted here with a revised date.'],
];

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <div className="mb-8 p-4 bg-amber-50 border border-amber-300 rounded-lg text-amber-800 text-sm font-medium">
        DRAFT — pending review by counsel. This scaffold is not yet a binding
        legal document.
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-10">Last updated: July 2026 (draft)</p>
      {SECTIONS.map(([heading, body]) => (
        <section key={heading} className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">{heading}</h2>
          <p className="text-gray-700 leading-relaxed">{body}</p>
        </section>
      ))}
      <p className="mt-12 text-sm text-gray-500">
        <a href="/" className="text-[#7C4DFF] hover:underline">← Back to DeedPro</a>
      </p>
    </main>
  );
}
