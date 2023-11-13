import webpack from 'webpack';

export default class BlazingCachePlugin {
    apply(compiler: webpack.Compiler) {
        compiler.hooks.compilation.tap('BlazingCachePlugin', compilation => {
            compilation.hooks.processAssets.tap({
                name: 'BlazingCachePlugin',
                stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
            }, assets => {
                const sources = compilation.compiler.webpack.sources;

                var a: string[] = [];
                Object.entries(assets).forEach(([pathname, source]) => {
                    if (!pathname.endsWith('.html') && !pathname.endsWith('.js') && !pathname.endsWith('.css') && !pathname.endsWith('.woff') && !pathname.endsWith('.woff2')) {
                        a.push(pathname.startsWith('/') ? pathname.substring(1) : pathname);
                    }
                });
                compilation.deleteAsset('assets.json');
                compilation.emitAsset('assets.json', new sources.RawSource(JSON.stringify({a})));
            });
        });
    }
}
