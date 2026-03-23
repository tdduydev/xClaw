import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

const isExport = process.env.NEXT_OUTPUT === 'export';

/** @type {import('next').NextConfig} */
const config = {
  serverExternalPackages: ['@takumi-rs/image-response'],
  reactStrictMode: true,
  output: isExport ? 'export' : 'standalone',
  // Static export requires unoptimized images (Next.js Image API unavailable)
  ...(isExport ? { images: { unoptimized: true } } : {}),
  ...(isExport
    ? {}
    : {
      async rewrites() {
        return [
          {
            source: '/docs/:path*.mdx',
            destination: '/llms.mdx/docs/:path*',
          },
        ];
      },
    }),
};

export default withMDX(config);
