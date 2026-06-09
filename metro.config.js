const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    ...config.resolver?.extraNodeModules,
    univind: path.resolve(__dirname, 'src/lib/univind-stub.js'),
  },
};

module.exports = withNativeWind(config, { input: './global.css' });
