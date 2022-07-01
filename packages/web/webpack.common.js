const path = require("path");
const webpack = require("webpack");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  entry: {
    app: "./build/app"
  },
  watchOptions: {
    ignored: /node_modules/,
    aggregateTimeout: 300,
    poll: 500
  },
  output: {
    path: path.join(__dirname, "dist"),
    filename: "[name].[contenthash:8].js"
  },
  module: {
    rules: [
      {
        test: /worker.js$/,
        use: {
          loader: "worker-loader",
          options: {
            filename: "[name].[contenthash:8].js"
          }
        }
      },
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        use: {
          loader: "babel-loader"
        }
      },
      {
        test: /\.ejs$/,
        use: {
          loader: "ejs-loader"
        }
      },
      {
        test: /\.scss$/,
        use: [
          MiniCssExtractPlugin.loader,
          "css-loader",
          "sass-loader"
        ]
      },
      {
        test: /\.(png|jpg|gif|svg)$/,
        loader: "url-loader",
        options: {
          limit: 1024,
          name: "[name].[contenthash:8].[ext]"
        }
      },
      {
        test: /\.(eot|ttf|woff|woff2)$/,
        loader: "file-loader",
        options: {
          name: "[name].[contenthash:8].[ext]"
        }
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      BUILD_DATE: new Date().getTime(),
      VERSION: JSON.stringify(require("./package.json").version)
    }),
    new CleanWebpackPlugin({
      cleanOnceBeforeBuildPatterns: ["dist/*"]
    }),
    new MiniCssExtractPlugin({
      filename: "[name].[contenthash:8].css"
    }),
    new CopyWebpackPlugin({ patterns: [{ from: "src/assets/", to: "." }] })
  ]
};
