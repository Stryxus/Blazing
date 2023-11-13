import path from 'path';
import process from 'process';

import webpack, { Stats } from 'webpack';
import * as HtmlWebpackPlugin from 'html-webpack-plugin';
import * as MiniCssExtractPlugin from 'mini-css-extract-plugin';
import * as ESLintPlugin from 'eslint-webpack-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin';

import BlazingMediaMinificationPlugin from './plugins/blazingMediaMinificationPlugin';
import BlazingCachePlugin from './plugins/blazingCachePlugin';

var argEnv: string | undefined;
var argPath: string | undefined;

process.argv.forEach((val, index, array) => {
    if (val === '--env') {
        argEnv = array[index + 1];
    }
    if (val === '--path') {
        argPath = array[index + 1];
    }
});

if (argEnv && argPath)
{
    const wwwrootdevPath = path.resolve(argPath, 'wwwroot-dev');
    const tsconfig: string = path.resolve(wwwrootdevPath, 'tsconfig.json');
    const config: webpack.Configuration = {
        mode: argEnv == 'dev' ? 'development' : 'production',
        entry: path.resolve(wwwrootdevPath, 'blazing-assets.js'),
        context: wwwrootdevPath,
        output: {
            path: path.resolve(argPath, 'wwwroot'),
            publicPath: '',
            filename: '[name].[contenthash].js',
            globalObject: 'this',
            clean: true,
            asyncChunks: true,
            assetModuleFilename: (pathData: any) => {
                let filepath = path.dirname(pathData.filename).split('/').slice(1).join('/');
                filepath = filepath.includes('/') ? filepath.slice(12) : filepath.slice(11);
                return `${filepath}/[name].[contenthash][ext]`;
            },
        },
        stats: {
            children: argEnv === 'dev',
            errorDetails: argEnv === 'dev',
        },
        module: {
            rules: [
                {
                    test: /\.sass$/i,
                    use: [
                        { loader: require.resolve('style-loader'), },
                        { loader: require.resolve('css-loader'), options: { sourceMap: argEnv === 'dev' } },
                        {
                            loader: require.resolve('postcss-loader'),
                            options: {
                                postcssOptions: {
                                    plugins: () => { return [ require('autoprefixer'), ]; }
                                }
                            }
                        },
                        { loader: require.resolve('sass-loader'), options: { sourceMap: argEnv === 'dev' } },
                    ],
                },
                {
                    test: /\.ts$/i,
                    loader: require.resolve('ts-loader'),
                    options: { configFile: tsconfig, },
                },
                {
                    test: /\.(png|json|mp4|aac|svg)$/i,
                    type: 'asset',
                },
                {
                    test: /\.woff2?$/,
                    type: 'asset',
                    generator: { filename: './fonts/[name].[contenthash][ext]', },
                },
            ],
        },
        plugins: [
            new HtmlWebpackPlugin.default({ template: path.resolve(wwwrootdevPath, 'index.html'), }),
            new MiniCssExtractPlugin.default({ filename: './[name].[contenthash].css', }),
            new ESLintPlugin.default(),
            {
                apply: (compiler: webpack.Compiler) => {
                    if (argEnv === 'prod') {
                        compiler.hooks.done.tap('DonePlugin', () => {
                            setTimeout(() => {
                                process.exit(0)
                            })
                        });
                    }
                }
            },
            new BlazingMediaMinificationPlugin(),
            new BlazingCachePlugin(),
        ],
        resolveLoader: {
            plugins: [ new TsconfigPathsPlugin({ configFile: tsconfig, }), ]
        },
        optimization: {
            splitChunks: {
                maxSize: 100000,
            },
            minimize: true,
            minimizer: [
                '...',
                new TerserPlugin({
                    parallel: true,
                }),
            ],
        },
        performance: { hints: argEnv === 'prod' ? 'warning' : false },
        resolve: {
            extensions: ['.ts']
        },
    };

    const watch: webpack.Watching = webpack(config).watch({ ignored: ['^.*\/(?!(node_modules))[^\/]+$'] }, (err: Error | null | undefined, stats: Stats | undefined) =>
    {
        if (err) console.error(err.stack || err);
        if (stats)
        {
            const info = stats.toJson({
                colors: true,
            });
            if (stats.hasErrors()) console.error(info.errors);
            if (stats.hasWarnings()) console.warn(info.warnings);
        }
    });

    if (argEnv === 'prod') {
        watch.close((err: any, stats: any) => { if (err) console.error(err); });
    }
} else {
    console.error('Either or both of --env and --path were not declared!');
}
