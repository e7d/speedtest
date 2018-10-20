const path = require("path");
const CleanWebpackPlugin = require("clean-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

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
        filename: "[name].[chunkhash:8].js"
    },
    module: {
        rules: [
            {
                test: /worker.js$/,
                use: {
                    loader: "worker-loader",
                    options: {
                        name: "[name].[chunkhash:8].js"
                    }
                }
            },
            {
                test: /\..*\.js$/,
                exclude: /(node_modules)/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: ["env"],
                    }
                }
            },
            {
                test: /\.(scss)$/,
                use: ["style-loader", "css-loader", "sass-loader"]
            },
            {
                test: /\.(png|jpg|gif|svg|eot|ttf|woff|woff2)$/,
                loader: "url-loader",
                options: {
                    limit: 10000
                }
            }
        ]
    },
    plugins: [
        new CleanWebpackPlugin(["dist/*"], {
            root: __dirname
        }),
        new HtmlWebpackPlugin({
            inject: "body",
            template: "src/index.html",
            filename: "index.html",
            chunks: ["vendor", "app"],
            minify: {
                collapseWhitespace: true
            }
        }),
        new CopyWebpackPlugin([{ from: "src/assets/", to: "." }])
    ]
};
