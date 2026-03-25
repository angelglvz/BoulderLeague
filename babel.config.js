module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // react-native-reanimated DEBE ir último
      'react-native-reanimated/plugin',
    ],
  }
}

