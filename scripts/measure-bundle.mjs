#!/usr/bin/env node
// Computes "First Load JS per route" from the webpack entrypoints emitted by
// next.config's StatsWriterPlugin, sizing each asset from the built files on disk
// (raw + gzip). Writes bundle-sizes.json — the raw report consumed by the CI diff.
//
// Run after `next build --webpack`.

import { statSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = '.next';
const ENTRYPOINTS = join(DIST, 'analyze', 'entrypoints.json');
const OUT = 'bundle-sizes.json';

// Entrypoints whose assets every page inherits (App Router shared baseline).
const SHARED = ['main', 'main-app', 'app/layout'];

const rawCache = new Map();
const gzCache = new Map();

function rawSize(file) {
  if (rawCache.has(file)) return rawCache.get(file);
  let size = 0;

  try {
    size = statSync(join(DIST, file)).size;
  } catch {
    size = 0;
  }

  rawCache.set(file, size);

  return size;
}

function gzSize(file) {
  if (gzCache.has(file)) return gzCache.get(file);
  let size = 0;

  try {
    size = gzipSync(readFileSync(join(DIST, file))).length;
  } catch {
    size = 0;
  }

  gzCache.set(file, size);

  return size;
}

function jsAssets(entrypoint) {
  const assets = entrypoint?.assets ?? [];

  return assets
    .map((a) => {
      return typeof a === 'string' ? a : a.name;
    })
    .filter((name) => {
      return name && name.endsWith('.js');
    });
}

function sum(files, sizer) {
  return [...files].reduce((total, file) => {
    return total + sizer(file);
  }, 0);
}

const stats = JSON.parse(readFileSync(ENTRYPOINTS, 'utf8'));
const entrypoints = stats.entrypoints ?? {};

const sharedFiles = new Set(
  SHARED.flatMap((name) => {
    return jsAssets(entrypoints[name]);
  })
);

const routes = Object.keys(entrypoints)
  .filter((name) => {
    return name.startsWith('app/') && name.endsWith('/page');
  })
  .filter((name) => {
    return !name.includes('/api/');
  });

const report = {
  generatedAt: new Date().toISOString(),
  routes: {},
  unit: 'bytes',
  shared: {
    gzip: sum(sharedFiles, gzSize),
    raw: sum(sharedFiles, rawSize),
  },
};

for (const name of routes) {
  const route = name.replace(/^app/, '').replace(/\/page$/, '') || '/';
  const files = new Set([...sharedFiles, ...jsAssets(entrypoints[name])]);
  report.routes[route] = {
    gzip: sum(files, gzSize),
    raw: sum(files, rawSize),
  };
}

writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n');

const kib = (n) => {
  return (n / 1024).toFixed(1).padStart(9);
};

process.stdout.write('\nFirst Load JS per route\n\n');
process.stdout.write('route'.padEnd(30) + 'raw KiB'.padStart(9) + 'gz KiB'.padStart(9) + '\n');

for (const [route, size] of Object.entries(report.routes)) {
  process.stdout.write(route.padEnd(30) + kib(size.raw) + kib(size.gzip) + '\n');
}

process.stdout.write(`\nWrote ${OUT}\n`);
