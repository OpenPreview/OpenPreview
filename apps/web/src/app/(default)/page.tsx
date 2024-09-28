import { Metadata } from 'next';
import CTA from '../../components/cta';
import FAQ from '../../components/faq';
import Features from '../../components/features';
import Hero from '../../components/hero';
import Pricing from '../../components/pricing';

export const metadata: Metadata = {
  title: 'OpenPreview',
  description:
    'OpenPreview is a powerful preview domain toolbar for websites. Add comments and collaborate directly on your web pages.',
};

export default function Home() {
  return (
    <>
      <Hero />
      <Features />
      <Pricing />
      <FAQ />
      <CTA />
    </>
  );
}
