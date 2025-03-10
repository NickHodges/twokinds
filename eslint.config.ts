import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import astroPlugin from 'eslint-plugin-astro';
import type { Linter } from 'eslint';

export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    ignores: [
      'dist/**',
      '.astro/**',
      'node_modules/**',
      'package-lock.json',
      'package.json',
      '**/*.config.js',
      '**/*.config.cjs',
      '**/*.config.mjs',
      'public/**',
    ],
  },
  {
    files: ['**/*.{js,ts,astro}'],
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 2022,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    files: ['**/*.astro'],
    ...astroPlugin.configs.recommended,
  },
] as Linter.FlatConfig[];