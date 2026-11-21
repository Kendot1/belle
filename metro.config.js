const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('sql');
config.resolver.assetExts.push('wasm');

// Optimize bundle size
config.transformer.minifierConfig = {
  compress: {
    drop_console: true, // Remove console.log in production
  },
};

module.exports = config;
