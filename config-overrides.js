const {join, resolve} = require('path');
const pkg = require('./package.json');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const libraryName= pkg.name;
module.exports = function override(config, env) {
    return { ...(config),
        entry: join(__dirname, "./src/index.tsx"),
        output: {
            path: join(__dirname, './dist'),
            //filename: 'JSONEditor.js',
            library: libraryName,
            libraryTarget: 'umd',
            publicPath: '/dist/',
            umdNamedDefine: true
        },
        resolve: {
            alias: {
                'react': resolve(__dirname, './node_modules/react'),
                'react-dom': resolve(__dirname, './node_modules/react-dom'),
                'assets': resolve(__dirname, 'assets')
            }
        },
        externals: {
            // Don't bundle react or react-dom
            react: {
                commonjs: "react",
                commonjs2: "react",
                amd: "React",
                root: "React"
            },
            "react-dom": {
                commonjs: "react-dom",
                commonjs2: "react-dom",
                amd: "ReactDOM",
                root: "ReactDOM"
            }
        },
        plugins: [new MiniCssExtractPlugin()],
        module: {
            rules: [
                {
                    test: /\.css$/i,
                    use: [MiniCssExtractPlugin.loader, "css-loader"],
                    // use: ExtractTextPlugin.extract({
                    //     fallback: 'style-loader',
                    //     use: [
                    //         'css-loader',
                    //         'sass-loader'
                    //     ]
                    // })
                },
                {
                    test: /\.(png|svg|jpg|gif)$/,
                    use: [
                        {
                            loader: 'url-loader',
                            options: {
                                fallback: "file-loader",
                                name: "[name][md5:hash].[ext]",
                                outputPath: 'assets/',
                                publicPath: '/assets/'
                            }
                        }
                    ]
                },
                // {
                //     test: /\.(js|jsx)$/,
                //     use: ["babel-loader"],
                //     include: resolve(__dirname, "src"),
                //     exclude: /node_modules/,
                // },
                // {
                //     test: /\.(ts|tsx)$/,
                //     use: ["babel-loader"],
                //     include: resolve(__dirname, "src"),
                //     exclude: /node_modules/,
                // }
                {
                    test: /\.m?(j|t)sx?$/,
                    loader: 'babel-loader',
                    exclude: /node_modules/,
                },
            ],

        }
    }
}