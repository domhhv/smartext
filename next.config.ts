import filterWebpackStats from '@bundle-stats/plugin-webpack-filter';
import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';
import { StatsWriterPlugin } from 'webpack-stats-plugin';

const nextConfig: NextConfig = {
  webpack: (config, options) => {
    const { dev, isServer, nextRuntime } = options;

    if (!dev && !isServer && !nextRuntime) {
      config.plugins.push(
        new StatsWriterPlugin({
          filename: '../webpack-stats.json',
          transform: (webpackStats) => {
            const filteredSource = filterWebpackStats(webpackStats);

            return JSON.stringify(filteredSource);
          },
          stats: {
            assets: true,
            chunks: true,
            modules: true,
          },
        })
      );
      config.plugins.push(
        new StatsWriterPlugin({
          filename: '../.next/analyze/entrypoints.json',
          stats: {
            all: false,
            entrypoints: true,
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
