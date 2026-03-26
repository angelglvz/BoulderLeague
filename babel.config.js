module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // react-native-reanimated DEBE ir último (incluye worklets internamente en v4.x)
      'react-native-reanimated/plugin',
    ],
  }
}
