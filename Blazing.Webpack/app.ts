import path from 'path';
import process from 'process';

import webpack, { Stats } from 'webpack';
import * as HtmlWebpackPlugin from 'html-webpack-plugin';
import * as MiniCssExtractPlugin from 'mini-css-extract-plugin';
import * as ESLintPlugin from 'eslint-webpack-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin';

import BlazingMinificationPlugin from './plugins/blazingMinificationPlugin';
import BlazingMediaMinificationPlugin from './plugins/blazingMediaMinificationPlugin';
import BlazingCachePlugin from './plugins/blazingCachePlugin';

const isDev = process.env.NODE_ENV == 'dev';
var argPath: string | undefined;

process.argv.forEach((val, index, array) => {
    if (val === '--path') {
        argPath = array[index + 1];
    }
});

if (argPath)
{
    process.stdout.write(`${String.fromCharCode(27)}]0;Blazing${String.fromCharCode(7)}`);

    const wwwrootdevPath = path.resolve(argPath, 'wwwroot-dev');
    const tsconfig: string = path.resolve(wwwrootdevPath, 'tsconfig.json');
    const config: webpack.Configuration = {
        mode: isDev ? 'development' : 'production',
        entry: path.resolve(wwwrootdevPath, 'blazing-assets.js'),
        context: wwwrootdevPath,
        output: {
            path: path.resolve(argPath, 'wwwroot'),
            publicPath: '',
            filename: '0.js',
            globalObject: 'this',
            clean: true,
            asyncChunks: true,
            assetModuleFilename: (pathData: any) => {
                let filepath = path.dirname(pathData.filename).split('/').slice(1).join('/');
                filepath = filepath.includes('/') ? filepath.slice(12) : filepath.slice(11);
                return `${filepath}/[name][ext]`;
            },
        },
        stats: {
            children: isDev,
            errorDetails: isDev,
        },
        module: {
            rules: [
                {
                    test: /\.sass$/i,
                    use: [
                        MiniCssExtractPlugin.loader,
                        { loader: require.resolve('css-loader'), options: { sourceMap: true} },
                        {
                            loader: require.resolve('postcss-loader'),
                            options: {
                                sourceMap: true,
                                postcssOptions: {
                                    plugins: () =>
                                    [
                                        'autoprefixer',
                                        {},
                                    ],
                                }
                            }
                        },
                        { loader: require.resolve('resolve-url-loader'), options: { } },
                        { loader: require.resolve('sass-loader'), options: { sourceMap: true } },
                    ],
                },
                {
                    test: /\.ts$/i,
                    loader: require.resolve('ts-loader'),
                    options: { configFile: tsconfig, },
                },
                {
                    test: /\.(png|json|mp4|aac|svg|woff2)$/i,
                    type: 'asset',
                },
            ],
        },
        plugins: [
            new HtmlWebpackPlugin.default({ template: path.resolve(wwwrootdevPath, 'index.html'), }),
            new MiniCssExtractPlugin.default({ filename: '0.css' }),
            new ESLintPlugin.default(),
            {
                apply: (compiler: webpack.Compiler) => {
                    if (!isDev) {
                        compiler.hooks.done.tap('DonePlugin', () => {
                            setTimeout(() => {
                                process.exit(0)
                            })
                        });
                    }
                }
            },
            new BlazingMinificationPlugin(),
            new BlazingMediaMinificationPlugin(),
            new BlazingCachePlugin(),
        ],
        resolveLoader: {
            plugins: [ new TsconfigPathsPlugin({ configFile: tsconfig, }), ]
        },
        optimization: {
            minimize: true,
            minimizer: [
                '...',
                new TerserPlugin({
                    parallel: true,
                }),
            ],
        },
        performance: { hints: !isDev ? 'warning' : false },
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

    if (!isDev) {
        watch.close((err: any, stats: any) => { if (err) console.error(err); });
    }
} else {
    console.error('Either or both of --env and --path were not declared!');
}
