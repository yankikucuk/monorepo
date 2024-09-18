//@ ts-check

import eslintImport from 'eslint-plugin-import';
import jsdoc from 'eslint-plugin-jsdoc';
import node from 'eslint-plugin-node';
import prettier from 'eslint-plugin-prettier';
import tseslint from 'typescript-eslint';

export default [
  {
    root: true,
    files: ['**/*.{js,ts}'],
    ignores: ['node_modules', '.git', '.husky', '.github', '.vscode'],
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 2024,
      parserOptions: {
        warnOnUnsupportedTypeScriptVersion: true,
        allowAutomaticSingleRunInference: true,
        project: ['tsconfig.eslint.json', 'packages/*/tsconfig.eslint.json'],
      },
    },
    plugins: {
      tseslint,
      import: eslintImport,
      jsdoc,
      node,
      prettier,
    },
    rules: {
      /**
       * Plugins
       */
      // Import -> https://github.com/import-js/eslint-plugin-import#eslint-plugin-import
      'import/order': [
        'error',
        {
          groups: ['builtin', 'internal', 'external', 'index', 'parent', 'sibling', 'object', 'type'],
          alphabetize: {
            order: 'asc',
          },
        },
      ],
      //'import/no-mutable-exports': ['error'],
      //'import/no-deprecated': ['error'],
      //'import/no-commonjs': ['error'],
      'import/no-dynamic-require': ['error'],
      // Jsdoc -> https://github.com/gajus/eslint-plugin-jsdoc#configuration
      'jsdoc/check-access': ['warn'],
      'jsdoc/check-alignment': ['warn'],
      'jsdoc/check-param-names': ['warn'],
      'jsdoc/check-property-names': ['warn'],
      'jsdoc/check-tag-names': ['warn'],
      'jsdoc/check-types': ['warn'],
      'jsdoc/check-values': ['warn'],
      'jsdoc/empty-tags': ['warn'],
      'jsdoc/implements-on-classes': ['warn'],
      'jsdoc/multiline-blocks': ['warn'],
      'jsdoc/no-multi-asterisks': ['warn'],
      'jsdoc/require-jsdoc': ['warn'],
      'jsdoc/require-param': ['warn'],
      'jsdoc/require-param-description': ['warn'],
      'jsdoc/require-param-name': ['warn'],
      'jsdoc/require-param-type': ['warn'],
      'jsdoc/require-property': ['warn'],
      'jsdoc/require-property-description': ['warn'],
      'jsdoc/require-property-name': ['warn'],
      'jsdoc/require-property-type': ['warn'],
      'jsdoc/require-returns': ['warn'],
      'jsdoc/require-returns-check': ['warn'],
      'jsdoc/require-returns-type': ['warn'],
      'jsdoc/require-yields': ['warn'],
      'jsdoc/require-yields-check': ['warn'],
      'jsdoc/tag-lines': ['warn'],
      'jsdoc/valid-types': ['warn'],
      // Node -> https://github.com/mysticatea/eslint-plugin-node#eslint-plugin-node
      //'node/no-unsupported-features/es-builtins': ['error'],
      'node/process-exit-as-throw': ['error'],
      'node/shebang': ['error'],
      // Prettier -> https://github.com/prettier/eslint-plugin-prettier#readme
      'prettier/prettier': [
        'error',
        {
          printWidth: 120,
          tabWidth: 2,
          singleQuote: true,
          quoteProps: 'as-needed',
          arrowParens: 'avoid',
          trailingComma: 'all',
          endOfLine: 'lf',
        },
        {
          usePrettierrc: false,
          fileInfoOptions: {
            withNodeModules: true,
          },
        },
      ],
      /**
       * Default
       * Possible Problems
       */
      'constructor-super': ['error'],
      'for-direction': ['error'],
      'getter-return': ['error'],
      'no-async-promise-executor': ['error'],
      'no-class-assign': ['error'],
      'no-compare-neg-zero': ['error'],
      'no-cond-assign': ['error'],
      'no-const-assign': ['error'],
      'no-constant-condition': ['error'],
      'no-control-regex': ['error'],
      'no-debugger': ['error'],
      'no-dupe-args': ['error'],
      'no-dupe-class-members': ['error'],
      'no-dupe-else-if': ['error'],
      'no-dupe-keys': ['error'],
      'no-duplicate-case': ['error'],
      'no-duplicate-imports': ['error'],
      'no-empty-character-class': ['error'],
      'no-empty-pattern': ['error'],
      'no-ex-assign': ['error'],
      'no-fallthrough': ['error'],
      'no-func-assign': ['error'],
      'no-inner-declarations': ['error'],
      'no-invalid-regexp': ['error'],
      'no-irregular-whitespace': ['error'],
      'no-loss-of-precision': ['error'],
      'no-misleading-character-class': ['error'],
      'no-obj-calls': ['error'],
      'no-prototype-builtins': ['error'],
      'no-self-assign': ['error'],
      'no-setter-return': ['error'],
      'no-sparse-arrays': ['error'],
      'no-this-before-super': ['error'],
      'no-undef': ['error'],
      'no-unexpected-multiline': ['error'],
      'no-unreachable': ['error'],
      'no-unsafe-finally': ['error'],
      'no-unsafe-negation': ['error'],
      'no-unsafe-optional-chaining': ['error'],
      'no-unused-vars': ['error'],
      'no-useless-backreference': ['error'],
      'use-isnan': ['error'],
      'valid-typeof': ['error'],
      strict: ['error'],
      /**
       * Backend
       * Possible Problems
       */
      'no-await-in-loop': ['error'],
      'no-template-curly-in-string': ['error'],
      'array-callback-return': ['error'],
      'no-self-compare': ['error'],
      'no-unmodified-loop-condition': ['error'],
      'no-unused-private-class-members': ['error'],
      'no-use-before-define': ['error', { functions: true, classes: true, variables: true }],
      /**
       * Default
       * Suggestions
       */
      'no-case-declarations': ['error'],
      'no-delete-var': ['error'],
      'no-empty': ['error'],
      'no-eval': ['error'],
      'no-extra-boolean-cast': ['error'],
      'no-global-assign': ['error'],
      'no-nonoctal-decimal-escape': ['error'],
      'no-octal': ['error'],
      'no-redeclare': ['error'],
      'no-regex-spaces': ['error'],
      'no-shadow-restricted-names': ['error'],
      'no-unused-labels': ['error'],
      'no-useless-catch': ['error'],
      'no-useless-escape': ['error'],
      'no-with': ['error'],
      'require-yield': ['error'],
      /**
       * Backend
       * Suggestions
       */
      'accessor-pairs': ['error'],
      'consistent-return': ['error'],
      curly: ['error'],
      'dot-notation': ['error'],
      eqeqeq: ['error'],
      'no-empty-function': ['error'],
      'no-implied-eval': ['error'],
      'no-invalid-this': ['error'],
      'no-lone-blocks': ['error'],
      'no-new-func': ['error'],
      'no-new-wrappers': ['error'],
      'no-new': ['error'],
      'no-octal-escape': ['error'],
      'no-return-assign': ['error'],
      'no-sequences': ['error'],
      'no-throw-literal': ['error'],
      'no-unused-expressions': ['error'],
      'no-useless-call': ['error'],
      'no-useless-concat': ['error'],
      'no-useless-return': ['error'],
      'no-void': ['error'],
      'no-warning-comments': ['error'],
      'prefer-promise-reject-errors': ['error'],
      'require-await': ['error'],
      yoda: ['error'],
      'no-label-var': ['error'],
      'no-shadow': ['error'],
      'no-undef-init': ['error'],
      'capitalized-comments': ['error', 'always', { ignoreConsecutiveComments: true }],
      'consistent-this': ['error'],
      'func-names': ['error'],
      'func-style': ['error', 'declaration', { allowArrowFunctions: true }],
      'max-depth': ['error'],
      'max-nested-callbacks': ['error', { max: 4 }],
      'new-cap': ['error'],
      'no-array-constructor': ['error'],
      'no-inline-comments': ['error'],
      'no-lonely-if': ['error'],
      'no-unneeded-ternary': ['error'],
      'operator-assignment': ['error'],
      'arrow-body-style': ['error'],
      'no-useless-computed-key': ['error'],
      'no-useless-constructor': ['error'],
      'prefer-arrow-callback': ['error'],
      'prefer-numeric-literals': ['error'],
      'prefer-rest-params': ['error'],
      'prefer-spread': ['error'],
      'prefer-template': ['error'],
      camelcase: ['error'],
      complexity: ['error', { max: 15 }],
      'default-case': ['error'],
      'default-case-last': ['error'],
      'default-param-last': ['error'],
      'func-name-matching': ['error'],
      'grouped-accessor-pairs': ['error'],
      'guard-for-in': ['error'],
      'max-classes-per-file': ['error'],
      'no-console': ['error'],
      'no-eq-null': ['error'],
      'no-extra-bind': ['error'],
      'no-multi-assign': ['error'],
      'no-nested-ternary': ['error'],
      'no-proto': ['error'],
      'no-restricted-globals': [
        'error',
        {
          name: 'Buffer',
          message: 'Import Buffer from `node:buffer` instead.',
        },
        {
          name: 'process',
          message: 'Import process from `node:process` instead.',
        },
        {
          name: 'setTimeout',
          message: 'Import setTimeout from `node:timers` instead.',
        },
        {
          name: 'setInterval',
          message: 'Import setInterval from `node:timers` instead.',
        },
        {
          name: 'setImmediate',
          message: 'Import setImmediate from `node:timers` instead.',
        },
        {
          name: 'clearTimeout',
          message: 'Import clearTimeout from `node:timers` instead.',
        },
        {
          name: 'clearInterval',
          message: 'Import clearInterval from `node:timers` instead.',
        },
        {
          name: 'fs',
          message: 'Import process from `node:fs` instead.',
        },
      ],
      /**
       * Backend
       * Layout & Formatting
       */
      'unicode-bom': ['error'],
    },
  },
];
