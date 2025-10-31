export default function V0Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body data-v0-page>{children}</body>
    </html>
  );
}
