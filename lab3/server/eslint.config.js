module.exports = [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        process: 'readonly', console: 'readonly', Buffer: 'readonly',
        __dirname: 'readonly', require: 'readonly', module: 'readonly',
        setTimeout: 'readonly',
      },
    },
    rules: { 'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }] },
  },
  { ignores: ['node_modules/**', 'uploads/**'] },
];