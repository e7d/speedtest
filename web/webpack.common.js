const path = require("path");
const CleanWebpackPlugin = require("clean-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const extractSass = new ExtractTextPlugin({
    filename: "[name].[hash].css"
});

module.exports = {
    entry: {
        app: "./build/app"
    },
    watchOptions: {
        ignored: /node_modules/,
        aggregateTimeout: 300,
        poll: 500
    },
    plugins: [
        new CleanWebpackPlugin(["dist/*"], {
            root: __dirname
        }),
        extractSass,
        new HtmlWebpackPlugin({
            inject: "body",
            template: "src/index.html",
            filename: "index.html",
            chunks: ["app"],
            minify: {
                collapseWhitespace: true
            }
        }),
        new CopyWebpackPlugin([{ from: "assets/*" }])
    ],
    output: {
        path: path.join(__dirname, "dist"),
        filename: "[name].[chunkhash].js"
    },
    module: {
        loaders: [
            {
                test: /\.worker\.js$/,
                use: {
                    loader: "worker-loader"
                }
            },
            {
                test: /\.app\.js$/,
                exclude: /(node_modules)/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: ["env"]
                    }
                }
            },
            {
                test: /\.(css|scss)$/,
                use: extractSass.extract({
                    use: ["css-loader", "sass-loader"],
                    fallback: "style-loader"
                })
            },
            {
                test: /\.(png|jpg|gif|svg|eot|ttf|woff|woff2)$/,
                loader: "url-loader",
                options: {
                    limit: 10000
                }
            }
        ]
    }
};
