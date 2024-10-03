import Image from 'next/image';
import { useConfig } from 'nextra-theme-docs';

export default {
  logo: (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <div className="rounded-xl">
        <Image
          src="/images/OpenPreview-Logo.png"
          alt="OpenPreview Logo"
          width={32}
          height={32}
        />
      </div>
      <span style={{ marginLeft: '10px', fontSize: '1.2em' }}>OpenPreview</span>
    </div>
  ),
  project: {
    link: 'https://github.com/OpenPreview/OpenPreview',
  },
  useNextSeoProps() {
    return {
      titleTemplate: '%s – OpenPreview',
    };
  },
  head: () => {
    const { frontMatter } = useConfig();
    return (
      <>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta
          property="og:title"
          content={frontMatter.title || 'OpenPreview'}
        />
        <meta
          property="og:description"
          content={frontMatter.description || 'OpenPreview Documentation'}
        />
      </>
    );
  },
  primaryHue: 200, // Adjust this value to change the primary color
  primarySaturation: 100,
  darkMode: true,
  footer: {
    component: null,
  },
  sidebar: {
    defaultMenuCollapseLevel: 1,
    toggleButton: true,
  },
  toc: {
    float: true,
    title: 'On This Page',
  },
};
