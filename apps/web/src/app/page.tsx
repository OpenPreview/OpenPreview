import { Metadata } from 'next';
import Hero from '../components/hero';

const CARD_CONTENT = [
  {
    title: 'Caching Tasks',
    href: 'https://turbo.build/repo/docs/core-concepts/caching',
    cta: 'Read More',
  },
  {
    title: 'Running Tasks',
    href: 'https://turbo.build/repo/docs/core-concepts/monorepos/running-tasks',
    cta: 'Read More',
  },
  {
    title: 'Configuration Options',
    href: 'https://turbo.build/repo/docs/reference/configuration',
    cta: 'Read More',
  },
];

export const metadata: Metadata = {
  title: 'OpenPreview',
  description:
    'OpenPreview is a powerful preview domain toolbar for websites. Add comments and collaborate directly on your web pages.',
};

export default function Home() {
  return (
    <>
      <Hero />
    </>
  );
}
