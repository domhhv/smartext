import * as Sentry from '@sentry/nextjs';

if (!process.env.SENTRY_DSN) {
  console.warn('SENTRY_DSN is not set. Skipping Sentry initialization.');
} else {
  Sentry.init({
    debug: false,
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1,
    integrations: [
      Sentry.vercelAIIntegration({
        recordInputs: true,
        recordOutputs: true,
      }),
    ],
  });
}
