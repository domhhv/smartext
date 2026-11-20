/**
 * @filename: lint-staged.config.js
 * @type {import('lint-staged').Configuration}
 */
import path from 'path';

const config = {
  './package.json': ['npm run sort-package-json:check', 'npm run prettier:check'],
  '*.{md,js,ts,tsx}': ['npm run eslint:check', 'npm run prettier:check'],
  '*.{ts,tsx}': () => {
    return 'npm run typecheck';
  },
  'supabase/**/*.sql': (filenames) => {
    const cwd = process.cwd();

    const normalizedDockerPaths = filenames.map((filename) => {
      return path.relative(cwd, filename).replace(/\\/g, '/');
    });

    return [`npm run lint:sql ${normalizedDockerPaths.join(' ')}`];
  },
};

export default config;
