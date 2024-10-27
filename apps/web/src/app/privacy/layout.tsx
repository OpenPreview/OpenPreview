import Footer from '@/components/footer';
import Header from '@/components/header';

export const metadata = {
  title: 'OpenPreview',
  description:
    'OpenPreview is a powerful preview domain toolbar for websites. Add comments and collaborate directly on your web pages.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col overflow-hidden supports-[overflow:clip]:overflow-clip">
      <Header />
      <div className="flex flex-grow flex-col py-2">
        <main className="mx-auto h-full w-full max-w-5xl px-4 pt-8 lg:px-8">
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
}
