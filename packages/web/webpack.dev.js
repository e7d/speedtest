const HtmlWebpackPlugin = require("html-webpack-plugin");
const Merge = require("webpack-merge");
const common = require("./webpack.common.js");

module.exports = Merge(common, {
  mode: "development",
  devtool: "eval",
  plugins: [
    new HtmlWebpackPlugin({
      template: "src/index.ejs",
      chunks: ["app"]
    })
  ]
});
