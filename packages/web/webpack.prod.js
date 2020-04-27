const CommonConfig = require("./webpack.common.js");
const Merge = require("webpack-merge");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

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
    minimize: true,
    minimizer: [new OptimizeCSSAssetsPlugin(), new TerserPlugin()]
  }
});
