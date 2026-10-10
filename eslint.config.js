const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', 'ios/*', 'android/*', '.expo/*'],
  },
  {
    rules: {
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    // El plugin @typescript-eslint solo está registrado para TS/TSX en la
    // flat config de expo, así que acotamos sus reglas a esos archivos.
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];
