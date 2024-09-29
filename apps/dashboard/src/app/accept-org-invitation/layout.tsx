import { Toaster } from '@openpreview/ui/components/toaster';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <body
      className={`${inter.variable} font-inter bg-gray-50 tracking-tight text-gray-900 antialiased`}
    >
      <div className="flex min-h-screen flex-col items-center justify-center">
        <main className="w-full max-w-md">{children}</main>
      </div>
      <Toaster />
    </body>
  );
}
