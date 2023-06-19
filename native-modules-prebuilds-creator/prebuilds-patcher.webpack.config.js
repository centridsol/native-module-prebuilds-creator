const path = require('path');

module.exports = {
  entry: './src/PactherWrapper.ts',
  output: {
    filename: 'prebuilds-pacther.js',
    path: path.resolve(__dirname, 'src/templates'),
    libraryTarget: "commonjs"
  },
  mode: "none",
  target: "node",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
            {
              loader: 'ts-loader',
              options: {
                compilerOptions: {
                    rootDir: [path.join(__dirname, "../")]
                }
                
              }
            }
        ],
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
};