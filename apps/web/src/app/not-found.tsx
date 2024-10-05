import { createClient } from '@openpreview/db/server';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import Footer from '../components/footer';
import Header from '../components/header';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata = {
  title: 'OpenPreview - Page Not Found',
  description: 'The page you are looking for could not be found.',
};

export default async function NotFound() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return (
    <body
      className={`${inter.variable} font-inter bg-gray-50 tracking-tight text-gray-900 antialiased`}
    >
      <div className="flex min-h-screen flex-col overflow-hidden supports-[overflow:clip]:overflow-clip">
        <Header />
        <div className="flex flex-grow items-center justify-center">
          <main className="mx-auto w-full max-w-md px-4">
            <div className="text-center">
              <p className="text-primary text-base font-semibold">404</p>
              <h1 className="text-foreground mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
                Page not found
              </h1>
              <p className="text-muted-foreground mt-2 text-base">
                Sorry, we couldn't find the page you're looking for.
              </p>
              <div className="mt-6">
                <Link
                  href="/"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-primary rounded-md px-3.5 py-2.5 text-sm font-semibold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  Go back home
                </Link>
              </div>
            </div>
          </main>
        </div>
        <Footer />
      </div>
    </body>
  );
}
