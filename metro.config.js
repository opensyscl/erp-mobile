const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// local-packages/univind es un symlink desde node_modules/univind.
// Metro no sigue symlinks a menos que el target esté en watchFolders.
config.watchFolders = [
  ...(config.watchFolders ?? []),
  path.resolve(__dirname, 'local-packages'),
];

module.exports = withNativeWind(config, { input: './global.css' });
