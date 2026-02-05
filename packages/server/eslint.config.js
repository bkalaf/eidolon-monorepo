//eslint.config.js
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import prettierPlugin from 'eslint-plugin-prettier';
import globals from 'globals'; // Use the 'globals' package if available, or define manually
import reactPlugin from 'eslint-plugin-react';
import hooksPlugin from 'eslint-plugin-react-hooks';
import unusedImports from 'eslint-plugin-unused-imports';
import tselint from 'typescript-eslint';

const tsconfigRootDir = path.dirname(fileURLToPath(import.meta.url));

export default [
    ...tselint.configs.recommended,
    {
        ignores: ['.output/**']
    },
    // 1. Specific config for Node JS files (commitlint, jest, etc.)
    {
        files: ['*.js'],
        languageOptions: {
            globals: {
                ...globals.node,
                module: 'writable'
            }
        }
    },
    // 2. TypeScript Files
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                project: './tsconfig.json',
                tsconfigRootDir
            },
            globals: {
                ...globals.node, // This fixes 'Buffer' and 'process'
                ...globals.browser,
                console: 'readonly'
            }
        },
        plugins: {
            '@typescript-eslint': tsPlugin,
            prettier: prettierPlugin,
            react: reactPlugin,
            'react-hooks': hooksPlugin,
            'unused-imports': unusedImports
        },
        ignores: ['eslint.config.ts', 'assets/**/*.*'],
        rules: {
            ...reactPlugin.configs.recommended.rules,
            ...hooksPlugin.configs.recommended.rules,
            'react-hooks/exhaustive-deps': 'error',
            'react-hooks/rules-of-hooks': 'error',
            'react/prop-types': 'off',
            'react/react-in-jsx-scope': 'off', // Not needed in modern React
            'no-undef': 'off',
            'no-redeclare': 'off',
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': [
                'off',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^this$' // Helps with your 'this' warnings
                }
            ],

            'prettier/prettier': 'error',
            // Remove unused imports automatically (fixable)
            'unused-imports/no-unused-imports': 'error',

            // Warn on unused vars, but allow leading underscore
            'unused-imports/no-unused-vars': [
                'warn',
                {
                    vars: 'all',
                    varsIgnorePattern: '^_',
                    args: 'after-used',
                    argsIgnorePattern: '^_'
                }
            ]
        }
    }
];
