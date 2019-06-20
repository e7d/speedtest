const CommonConfig = require("./webpack.common.js");
const Merge = require("webpack-merge");
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = Merge(CommonConfig, {
  mode: "production",
  plugins: [
    new HtmlWebpackPlugin({
      template: "src/index.html",
      chunks: ["app"],
      minify: {
        collapseWhitespace: true
      }
    })
  ],
  optimization: {
    minimizer: [new UglifyJsPlugin(), new OptimizeCSSAssetsPlugin()]
  }
});
