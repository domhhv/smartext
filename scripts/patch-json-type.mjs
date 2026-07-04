#!/usr/bin/env node

/**
 * Patches the `Json` type in the generated Supabase types.
 *
 * Supabase generates a self-referential `Json` type:
 *
 *   export type Json =
 *     | string
 *     | number
 *     | boolean
 *     | null
 *     | { [key: string]: Json | undefined }
 *     | Json[]
 *
 * Its deep recursion makes camelcase-keys' type inference blow the TypeScript
 * instantiation depth limit (TS2589: "Type instantiation is excessively deep and
 * possibly infinite") wherever a Supabase row containing a JSON column is passed
 * through `camelcaseKeys(data, { deep: true })`.
 *
 * We replace it with a non-recursive form. Call sites already narrow JSON columns
 * to their concrete shapes, so the loss of recursive precision is harmless.
 *
 * This script is chained into the `db:gen-types` npm script so it runs after every
 * regeneration. It is idempotent: running it on an already-patched file is a no-op.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const typesPath = join(__dirname, '..', 'supabase', 'database.types.ts');

const PATCHED_JSON = `/**
* NOTE: This Json type is patched by scripts/patch-json-type.mjs after every
* \`npm run db:gen-types\`. Supabase generates a self-referential Json type whose deep
* recursion makes camelcase-keys' type inference blow the TS instantiation depth
* limit (TS2589). The non-recursive form below avoids that; call sites narrow
* JSON columns to their concrete shapes anyway.
*/
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: unknown }
  | unknown[]`;

const source = readFileSync(typesPath, 'utf8');

const GENERATED_JSON_MULTI = `export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]`;

const GENERATED_JSON_SINGLE = `export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];`;

if (source.includes(PATCHED_JSON)) {
  console.info('patch-json-type: Json type already patched, skipping.');
  process.exit(0);
}

let patchedSource;

if (source.includes(GENERATED_JSON_MULTI)) {
  patchedSource = source.replace(GENERATED_JSON_MULTI, PATCHED_JSON);
} else if (source.includes(GENERATED_JSON_SINGLE)) {
  patchedSource = source.replace(GENERATED_JSON_SINGLE, PATCHED_JSON);
} else {
  console.error(
    'patch-json-type: could not find the generated Json type to patch.\n' +
      'The Supabase output format may have changed.'
  );
  process.exit(1);
}

writeFileSync(typesPath, patchedSource);
console.info('patch-json-type: replaced Json type with non-recursive variant.');
