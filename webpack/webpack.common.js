// noinspection JSUnusedLocalSymbols

const webpack = require("webpack")
const path = require("path")
const CopyPlugin = require("copy-webpack-plugin")
const srcDir = path.join(__dirname, "..", "src")

// noinspection JSUnusedGlobalSymbols
module.exports = {
  entry: {
    options: path.join(srcDir, 'options.tsx'),
    background: path.join(srcDir, 'background.ts'),
    content_script: path.join(srcDir, 'content_script.ts'),
  },
  output: {
    path: path.join(__dirname, "../dist/js"),
    filename: "[name].js",
  },
  optimization: {
    splitChunks: {
      name: "vendor",
      chunks(chunk) {
        return chunk.name !== 'background'
      }
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {from: ".", to: "../", context: "public"},
        {from: 'node_modules/jquery/dist/jquery.min.js', to: '../js'}
      ],
      options: {},
    }),
  ],
  externals: {
    jquery: 'jQuery',
  },
}
