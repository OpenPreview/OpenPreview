const { hostname } = require("os");

module.exports = {
  reactStrictMode: true,
  transpilePackages: ['ui'],
  images: {
    remotePatterns: [
      {
        hostname: 'assets.aceternity.com',
      },
      {
        hostname: 'images.unsplash.com',
      },
      {
        hostname: 'investa.so',
      },
      {
        hostname: 'www.google.com',
      },
      {
        hostname: 'localhost',
      },
    ],
  },
};

/* 
  async redirects() {
    return [
      {
        source: '/',
        destination: `${process.env.NEXT_PUBLIC_SITE_URL}`,
        permanent: false,
      },
    ];
  },*/