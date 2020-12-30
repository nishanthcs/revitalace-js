const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserPlugin = require("terser-webpack-plugin");


module.exports = {
    mode: "production",
    target: "web",
    devtool: "source-map",
    optimization: {
        minimize: true,
        minimizer: [new TerserPlugin({
           parallel: true,
            include: /.*ace.*\.js$/
        })],
    },
    entry: {
        "revitalace.min": "./src/main.js",
        "sample": "./src/sample/user.js"
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js'
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: "./src/index.html",
            filename: "index.html"
        })
    ],
    resolve: {
        alias: {
            "./": path.resolve(__dirname, 'node_modules/')
        },
        modules: [path.resolve(__dirname, 'node_modules/tern/lib'),'node_modules']
    },
    devServer: {
        compress: true,
        port: 9000,
        publicPath: '/',
        open: true
    }
};