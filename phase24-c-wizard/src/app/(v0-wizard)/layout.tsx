export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body data-v0-page data-v0-wizard suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
