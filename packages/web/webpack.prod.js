const common = require("./webpack.common.js");
const Merge = require("webpack-merge");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = Merge(common, {
  mode: "production",
  plugins: [
    new HtmlWebpackPlugin({
      template: "src/index.ejs",
      chunks: ["app"],
      minify: {
        collapseWhitespace: true
      }
    })
  ],
  optimization: {
    minimize: true,
    minimizer: [new CssMinimizerPlugin(), new TerserPlugin()]
  }
});
