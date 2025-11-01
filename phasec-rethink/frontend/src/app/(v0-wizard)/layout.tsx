export const metadata = { title: 'DeedPro — Modern Wizard' };

// NOTE: This layout deliberately sets data attributes on <body>
// so our CSS can scope to the wizard without fighting global styles.
export default function V0WizardLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body data-v0-page data-v0-wizard>
        {children}
      </body>
    </html>
  );
}
