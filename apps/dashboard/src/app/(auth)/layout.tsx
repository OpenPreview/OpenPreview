import { createClient } from '@lib/server';
import { Button } from '@openpreview/ui/components/button';
import { DotPattern } from '@openpreview/ui/components/dot-pattern';
import { Toaster } from '@openpreview/ui/components/toaster';
import { cn } from '@openpreview/ui/lib/utils';
import { ArrowLeft } from 'lucide-react';
import { Inter } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data?.onboarding_completed) {
      redirect('/');
    } else {
      redirect('/onboarding');
    }
  }

  return (
    <body
      className={`${inter.variable} font-inter bg-gray-50 tracking-tight text-gray-900 antialiased`}
    >
      <div className="flex min-h-screen flex-col lg:flex-row">
        {/* Top banner for mobile - Navy background */}
        <div className="relative bg-[#062056] p-4 lg:hidden">
          <DotPattern
            className={cn(
              'absolute inset-0 h-full w-full opacity-50',
              '[mask-image:radial-gradient(white,transparent_85%)]',
            )}
            width={20}
            height={20}
            cx={1}
            cy={1}
            cr={1}
          />
          <div className="relative flex items-center justify-center">
            <Image
              src="/images/logo.png"
              alt="OpenPreview Logo"
              width={40}
              height={40}
              className="mr-2"
            />
            <h1 className="text-2xl font-bold text-white">OpenPreview</h1>
          </div>
        </div>

        {/* Left side - Navy background (hidden on mobile) */}
        <div className="rounded-r-7xl relative hidden w-full bg-[#062056] lg:block lg:w-1/2">
          <DotPattern
            className={cn(
              'absolute inset-0 h-full w-full opacity-50',
              '[mask-image:radial-gradient(white,transparent_85%)]',
            )}
            width={20}
            height={20}
            cx={1}
            cy={1}
            cr={1}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <h1 className="text-4xl font-bold text-white">OpenPreview</h1>
          </div>
        </div>

        {/* Right side - Login content */}
        <div className="bg-background flex w-full flex-col lg:w-1/2">
          <div className="flex items-center justify-between p-4">
            <Button variant="ghost" size="sm" asChild>
              <Link
                href={`${process.env.NEXT_PUBLIC_SITE_URL}`}
                className="flex items-center"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </div>
          <div className="flex flex-grow items-center justify-center p-4 sm:p-8">
            {children}
          </div>
        </div>
      </div>
      <Toaster />
    </body>
  );
}
