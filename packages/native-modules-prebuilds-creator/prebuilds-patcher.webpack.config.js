const path = require('path');

module.exports = {
  entry: './src/PactherWrapper.ts',
  output: {
    filename: 'prebuild-patcher.js',
    path: path.resolve(__dirname, 'src/Operations/templates'),
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