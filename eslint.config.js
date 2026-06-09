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
    // El plugin @typescript-eslint solo está registrado para archivos TS
    // (eslint-config-expo/flat) — scopear la regla evita que explote al
    // lintear .js como este mismo config.
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];
