import '@openpreview/ui/styles/globals.css';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning={true}>
      <head>
        <Script />
      </head>
      {children}
    </html>
  );
}

const Script = () => {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `
  window.opvClientId = 'ff2a25b3-cef8-46a1-8497-999a0ab2760f';
`,
        }}
      />
      <script src={`${process.env.NEXT_PUBLIC_CDN_URL}/opv2.js`}></script>
    </>
  );
};
