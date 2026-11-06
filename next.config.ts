import type {NextConfig} from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Vercel uses its own output adapter; Docker still needs the standalone
  // server produced by `next build`.
  ...(process.env.VERCEL ? {} : {output: 'standalone' as const}),
  agentRules: false,
  experimental: {
    agentFeedback: false,
    // Only a dedicated E2E build exposes the Instant Navigation testing API.
    exposeTestingApiInProductionBuild: process.env.EXPOSE_TESTING_API === "1",
  },
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
};

export default withNextIntl(nextConfig);
