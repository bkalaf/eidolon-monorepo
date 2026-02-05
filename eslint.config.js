const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const globals = require('globals');
const reactPlugin = require('eslint-plugin-react');
const hooksPlugin = require('eslint-plugin-react-hooks');
const tselint = require('typescript-eslint');
const { defineConfig, globalIgnores } = require('eslint/config');

const tsconfigRootDir = __dirname;

module.exports = defineConfig([
    globalIgnores([
        'node_modules',
        '.yarn',
        '.pnp.*',
        'dist',
        'packages/**/dist/**',
        'apps/**/dist/**',
        'packages/services/functions/**',
        'packages/cloudflare/worker-configuration.d.ts',
        'packages/notes/**',
        '.next',
        '.output',
        '.cache'
    ]),
    ...tselint.configs.recommended,
    {
        ignores: ['apps/**/.output/**', 'packages/**/.output/**', 'services/**/dist/**']
    },
    {
        files: ['*.js'],
        languageOptions: {
            globals: {
                ...globals.node,
                module: 'writable'
            }
        },
        rules: {
            '@typescript-eslint/no-require-imports': 'off'
        }
    },
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                project: './tsconfig.json',
                tsconfigRootDir
            },
            globals: {
                ...globals.node,
                ...globals.browser,
                console: 'readonly'
            }
        },
        plugins: {
            '@typescript-eslint': tsPlugin,
            react: reactPlugin,
            'react-hooks': hooksPlugin
        },
        ignores: ['eslint.config.ts', 'assets/**/*.*', 'packages/cloudflare/worker-configuration.d.ts'],
        rules: {
            ...reactPlugin.configs.recommended.rules,
            ...hooksPlugin.configs.recommended.rules,
            'react-hooks/exhaustive-deps': 'error',
            'react-hooks/rules-of-hooks': 'error',
            'react/prop-types': 'off',
            'react/react-in-jsx-scope': 'off',
            'no-undef': 'off',
            'no-redeclare': 'off',
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^this$',
                    vars: 'all',
                    args: 'after-used'
                }
            ]
        },
        settings: {
            react: {
                version: 'detect'
            }
        }
    }
]);
