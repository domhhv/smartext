#!/usr/bin/env node
// Diffs two bundle-sizes.json reports and prints a Markdown table (gzip First
// Load JS per route, delta vs base). Used by CI to build the sticky PR comment.
//
//   node scripts/compare-bundle.mjs <base.json> <head.json>
//
// Missing base file (first run) => reports head as all-new, no failure.

import { readFileSync } from 'node:fs';

const [basePath, headPath] = process.argv.slice(2);

function load(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

const base = load(basePath);
const head = load(headPath);

if (!head) {
  process.stdout.write('No head bundle-sizes.json found — nothing to report.\n');
  process.exit(0);
}

const kib = (n) => {
  return (n / 1024).toFixed(1);
};

const signed = (n) => {
  return n >= 0 ? `+${n}` : `${n}`;
};

const pct = (from, to) => {
  return from === 0 ? '—' : `${signed(((to - from) / from) * 100).slice(0, 5)}%`;
};

const routes = new Set([...Object.keys(base?.routes ?? {}), ...Object.keys(head.routes ?? {})]);

const rows = [];
let regressed = false;

for (const route of [...routes].sort()) {
  const b = base?.routes?.[route]?.gzip ?? null;
  const h = head.routes?.[route]?.gzip ?? null;

  if (h === null) {
    rows.push(`| \`${route}\` | — | ${kib(b)} | removed |`);
    continue;
  }

  if (b === null) {
    rows.push(`| \`${route}\` | **${kib(h)}** | — | 🆕 new |`);
    continue;
  }

  const diff = h - b;
  const arrow = diff > 0 ? '🔴' : diff < 0 ? '🟢' : '⚪';
  if (diff > 0) regressed = true;
  const delta = diff === 0 ? '—' : `${arrow} ${signed(+kib(diff))} KiB (${pct(b, h)})`;
  rows.push(`| \`${route}\` | **${kib(h)}** | ${kib(b)} | ${delta} |`);
}

const sharedH = head.shared?.gzip ?? 0;
const sharedB = base?.shared?.gzip ?? null;
const sharedDelta =
  sharedB === null
    ? '🆕 new'
    : sharedH === sharedB
      ? '—'
      : `${sharedH > sharedB ? '🔴' : '🟢'} ${signed(+kib(sharedH - sharedB))} KiB`;

const lines = [
  '## 📦 First Load JS per route',
  '',
  'Gzipped client JS a fresh visit downloads, by route.',
  '',
  '| Route | This PR (KiB) | main (KiB) | Δ |',
  '|---|---:|---:|---|',
  ...rows,
  '',
  `**Shared baseline:** ${kib(sharedH)} KiB (${sharedDelta}) — loaded on every route.`,
  '',
  base ? '' : '_No baseline on main yet — this is the first report._',
  '<sub>Computed from webpack entrypoints in CI. Raw report: `bundle-sizes.json`.</sub>',
].filter((l) => {
  return l !== undefined;
});

process.stdout.write(lines.join('\n') + '\n');

// Signal a regression via exit code so a workflow *could* gate on it if desired.
// Default workflow does not fail the job on this.
if (regressed && process.env.FAIL_ON_REGRESSION === 'true') process.exit(1);
