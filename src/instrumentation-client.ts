import * as Sentry from '@sentry/nextjs';
import posthog from 'posthog-js';

if (!process.env.NEXT_PUBLIC_POSTHOG_KEY || !process.env.NEXT_PUBLIC_POSTHOG_HOST) {
  console.warn('NEXT_PUBLIC_POSTHOG_KEY or NEXT_PUBLIC_POSTHOG_HOST is not set. Skipping PostHog initialization.');
} else {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    defaults: '2025-05-24',
  });
}

if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
  console.warn('NEXT_PUBLIC_SENTRY_DSN is not set. Skipping Sentry initialization.');
} else {
  Sentry.init({
    debug: false,
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    enableLogs: true,
    integrations: [Sentry.replayIntegration()],
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    tracesSampleRate: 1,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
