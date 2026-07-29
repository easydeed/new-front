// HM3 — Terms of Service scaffold. Standard SaaS structure, clearly
// marked DRAFT pending owner/counsel review. The footer links here so
// /terms never 404s; the content is owner-gated.
export const metadata = {
  title: 'Terms of Service — DeedPro',
};

const SECTIONS: Array<[string, string]> = [
  ['1. The Service', 'DeedPro provides software that helps licensed professionals prepare California deed documents. The software suggests; the professional using it reviews, confirms, and decides. DeedPro is not a law firm and does not provide legal advice.'],
  ['2. Accounts', 'You are responsible for your account credentials and for all activity under your account. Provide accurate information and keep it current.'],
  ['3. Acceptable Use', 'Use the service only for lawful document preparation within your professional authority. Do not misuse, probe, or disrupt the service.'],
  ['4. Documents and Data', 'You own the documents you create. Generated PDFs are stored with a cryptographic fingerprint; completed documents are retained immutably. You are responsible for the accuracy of the information you confirm.'],
  ['5. Professional Responsibility', 'Every material field requires confirmation by the operating professional before a document generates. Software output is not a substitute for professional judgment or legal review.'],
  ['6. Fees', 'Paid plans are billed as described at purchase. Fees are non-refundable except as required by law.'],
  ['7. Disclaimers', 'The service is provided "as is" without warranties of any kind. DeedPro does not warrant that documents meet the requirements of any particular transaction or recorder.'],
  ['8. Limitation of Liability', 'To the maximum extent permitted by law, DeedPro is not liable for indirect, incidental, or consequential damages arising from use of the service.'],
  ['9. Termination', 'You may stop using the service at any time. We may suspend accounts that violate these terms.'],
  ['10. Changes', 'We may update these terms; material changes will be posted here with a revised date.'],
  ['11. Contact', 'Company identity and contact details pending — see the site footer.'],
];

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <div className="mb-8 p-4 bg-amber-50 border border-amber-300 rounded-lg text-amber-800 text-sm font-medium">
        DRAFT — pending review by counsel. This scaffold is not yet a binding
        legal document.
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
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
