import '@openpreview/ui/styles/globals.css';
import { OpenPreview } from '@openpreview/nextjs';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning={true}>
      <body
        className={`${inter.variable} font-inter bg-gray-50 tracking-tight text-gray-900 antialiased`}
      >
        {children}
        <OpenPreview
          projectId={'ff2a25b3-cef8-46a1-8497-999a0ab2760f'}
          cdnUrl={`${process.env.NEXT_PUBLIC_CDN_URL}/opv2.js`}
        />
      </body>
    </html>
  );
}

// const OpenPreview = () => {
//   return (
//     <>
//       <Script
//         dangerouslySetInnerHTML={{
//           __html: `
//           if (window.opv && typeof window.opv.init === 'function') {
//             window.opv.init({ opvProjectId: 'ff2a25b3-cef8-46a1-8497-999a0ab2760f' })
//           }
//           `,
//         }}
//       />
//       <Script src={`${process.env.NEXT_PUBLIC_CDN_URL}/opv2.js`} async defer />
//     </>
//   );
// };
