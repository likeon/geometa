import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export default [
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs['flat/recommended'],
  prettier,
  ...svelte.configs['flat/prettier'],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    }
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parserOptions: {
        parser: ts.parser
      }
    }
  },
  {
    files: ['**/*.svelte.ts', '**/*.svelte.js'],
    languageOptions: {
      parser: ts.parser,
      parserOptions: {
        project: true
      }
    }
  },
  {
    ignores: ['build/', '.svelte-kit/', 'dist/']
  },
  {
    rules: {
      // Re-enable no-explicit-any globally (was disabled before)
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ],
      'svelte/no-at-html-tags': 'off' // Disable XSS warning for {@html}
    }
  },
  {
    // Minimal linting for 3rd party UI components - only keep critical error checking
    files: ['**/src/lib/components/ui/**/*.{js,ts,svelte,svelte.ts,svelte.js}'],
    rules: {
      // Disable all style and type-related rules
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      'prefer-const': 'off',
      'no-empty': 'off',
      'no-unused-expressions': 'off',
      'svelte/no-unused-svelte-ignore': 'off',
      // Only keep critical error checking that would cause runtime crashes
      'svelte/valid-compile': 'error', // Keep this to catch actual compilation errors
      'svelte/no-dupe-else-if-blocks': 'error', // Keep this to prevent logic errors
      'svelte/no-dupe-on-directives': 'error', // Keep this to prevent duplicate handlers
      'svelte/no-dupe-style-properties': 'warn', // Downgrade to warning
      'svelte/require-optimized-style-attribute': 'off',
      'svelte/no-at-html-tags': 'off'
    }
  }
];
