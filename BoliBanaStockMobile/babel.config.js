module.exports = function (api) {
  api.cache(true);
  
  return {
    presets: [
      'babel-preset-expo'
    ],
    plugins: [
      // Plugin pour la résolution des modules
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: [
            '.ios.ts',
            '.android.ts',
            '.ts',
            '.ios.tsx',
            '.android.tsx',
            '.tsx',
            '.jsx',
            '.js',
            '.json',
            '.cjs',
            '.mjs'
          ],
          alias: {
            '@': './src'
          }
        }
      ],
      
      // Plugin pour react-native-reanimated (DOIT être en dernier)
      'react-native-reanimated/plugin'
    ]
  };
};
