import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';
import { StatsWriterPlugin } from 'webpack-stats-plugin';

const nextConfig: NextConfig = {
  webpack: (config, options) => {
    const { dev, isServer } = options;

    if (!dev && !isServer) {
      config.plugins.push(
        new StatsWriterPlugin({
          filename: '../webpack-stats.json',
          stats: {
            assets: true,
            chunks: true,
            modules: true,
          },
        })
      );
    }

    return config;
  },
};

export default withSentryConfig(nextConfig, {
  org: 'doms-org',
  project: 'smartext',
  silent: !process.env.CI,
  tunnelRoute: '/monitoring',
  widenClientFileUpload: true,
  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
