const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

// Apply NativeWind first so it can set its own resolveRequest.
// Then wrap that resolver so univind always maps to our stub —
// including imports that originate inside node_modules.
const config = withNativeWind(getDefaultConfig(__dirname), { input: './global.css' });

const univindStub = path.resolve(__dirname, 'src/lib/univind-stub.js');
const nwResolve = config.resolver?.resolveRequest;

config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    if (moduleName === 'univind') {
      return { filePath: univindStub, type: 'sourceFile' };
    }
    if (nwResolve) return nwResolve(context, moduleName, platform);
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
