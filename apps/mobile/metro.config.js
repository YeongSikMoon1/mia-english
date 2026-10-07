// 모노레일(npm workspaces)에서 packages/* 를 읽고, .vrm/.html 을 번들 에셋으로 취급한다.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const root = path.resolve(__dirname, '../..');
const config = getDefaultConfig(__dirname);
config.watchFolders = [root];
config.resolver.nodeModulesPaths = [path.join(__dirname, 'node_modules'), path.join(root, 'node_modules')];
config.resolver.assetExts.push('vrm', 'html');
config.resolver.sourceExts = config.resolver.sourceExts.filter((e) => e !== 'html');
module.exports = config;
