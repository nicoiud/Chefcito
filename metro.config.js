// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// El modelo de visión (Fase 2) es un binario que Metro debe tratar como
// asset, no como código. Sin esto el require de modelAsset.ts falla.
config.resolver.assetExts.push('tflite');

module.exports = config;
