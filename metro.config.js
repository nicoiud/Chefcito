// Learn more https://docs.expo.io/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// El modelo de visión (Fase 2) es un binario que Metro debe tratar como
// asset, no como código. Sin esto el require de modelAsset.ts falla.
config.resolver.assetExts.push('tflite');

// Viro trae variantes .web.js que dependen de @reactvision/viro-web-renderer.
// Chefcito hace AR solo en el celular —en web la pantalla usa la guía 2D—,
// así que en esa plataforma se resuelve a un stub en lugar de instalar un
// paquete que nunca se ejecutaría. Ver src/ar/viroWebStub.js.
const VIRO_WEB_RENDERER = '@reactvision/viro-web-renderer';
const viroWebStub = path.resolve(__dirname, 'src/ar/viroWebStub.js');

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === VIRO_WEB_RENDERER) {
    return { type: 'sourceFile', filePath: viroWebStub };
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
