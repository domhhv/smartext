import js from '@eslint/js';
import lexical from '@lexical/eslint-plugin';
import stylistic from '@stylistic/eslint-plugin';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import perfectionist from 'eslint-plugin-perfectionist';
import switchCase from 'eslint-plugin-switch-case';
import unusedImports from 'eslint-plugin-unused-imports';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tsEslint from 'typescript-eslint';

const plugins = {
  '@stylistic': stylistic,
  js,
  perfectionist,
  'switch-case': switchCase,
  'unused-imports': unusedImports,
};

const typescriptRules = {
  '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
  '@typescript-eslint/consistent-type-imports': 'error',
  '@typescript-eslint/no-deprecated': 'error',
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      argsIgnorePattern: '^_',
      ignoreRestSiblings: true,
      varsIgnorePattern: '^_',
    },
  ],
};

const javascriptRules = {
  '@stylistic/jsx-curly-brace-presence': ['error', { children: 'never', propElementValues: 'always', props: 'never' }],
  'arrow-body-style': ['error', 'always'],
  curly: 'error',
  'no-undef': 'off',
  'no-useless-rename': 'error',
  'object-shorthand': 'error',

  'switch-case/newline-between-switch-case': ['error', 'always', { fallthrough: 'never' }],

  'switch-case/no-case-curly': 'off',

  'unused-imports/no-unused-imports': 'error',

  'no-console': [
    'warn',
    {
      allow: ['info', 'warn', 'error'],
    },
  ],

  'padding-line-between-statements': [
    'error',
    { blankLine: 'always', next: 'return', prev: '*' },
    { blankLine: 'always', next: 'block-like', prev: '*' },
    { blankLine: 'always', next: 'block', prev: '*' },
    { blankLine: 'always', next: '*', prev: 'block-like' },
    { blankLine: 'always', next: '*', prev: 'block' },
  ],

  'perfectionist/sort-exports': [
    'error',
    {
      ignoreCase: true,
      order: 'asc',
      type: 'alphabetical',
    },
  ],

  'perfectionist/sort-imports': [
    'error',
    {
      ignoreCase: true,
      newlinesBetween: 1,
      order: 'asc',
      tsconfig: { rootDir: '.' },
      type: 'alphabetical',
      groups: [
        'builtin',
        { newlinesBetween: 1 },
        'external',
        { newlinesBetween: 1 },
        'internal',
        { newlinesBetween: 1 },
        'parent',
        { newlinesBetween: 1 },
        ['index', 'sibling'],
      ],
    },
  ],

  'perfectionist/sort-jsx-props': [
    'error',
    {
      type: 'line-length',
    },
  ],

  'perfectionist/sort-named-imports': [
    'error',
    {
      type: 'line-length',
    },
  ],

  'perfectionist/sort-object-types': [
    'error',
    {
      groups: ['unknown', 'method', 'multiline-member'],
    },
  ],

  'perfectionist/sort-objects': [
    'error',
    {
      groups: ['unknown', 'method', 'multiline-member'],
    },
  ],
};

export default defineConfig(
  [
    globalIgnores(['node_modules/**', '.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
    lexical.configs['flat/recommended'],
    {
      extends: [js.configs.recommended, tsEslint.configs.recommended, switchCase.configs.recommended],
      files: ['*.ts', 'src/**/*.{ts,tsx}', 'supabase/**/*.ts'],
      plugins,
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir: import.meta.dirname,
        },
      },
      rules: {
        ...typescriptRules,
        ...javascriptRules,
      },
    },
    {
      extends: [js.configs.recommended, tsEslint.configs.recommended, switchCase.configs.recommended],
      files: ['*.mjs', 'scripts/*.mjs'],
      plugins,
      rules: javascriptRules,
      languageOptions: {
        globals: {
          ...globals.node,
        },
      },
    },
  ],
  eslintConfigPrettier
);
