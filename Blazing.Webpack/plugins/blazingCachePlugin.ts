import webpack from 'webpack';

import { Log } from '../utils';

export default class BlazingCachePlugin {
    apply(compiler: webpack.Compiler) {
        compiler.hooks.compilation.tap('BlazingCachePlugin', compilation =>
        {
            compilation.hooks.afterOptimizeAssets.tap({
                name: 'BlazingCachePlugin',
                stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
            }, assets => {
                const sources = compilation.compiler.webpack.sources;
                console.log(`${Log.fg.green}Starting Asset Caching Stage...${Log.reset}`);

                var a: string[] = [];
                Object.entries(assets).forEach(([pathname, source]) => {
                    if (pathname !== 'assets.json' && !pathname.endsWith('.html') && !pathname.endsWith('.js') && !pathname.endsWith('.css') && !pathname.endsWith('.woff') && !pathname.endsWith('.woff2'))
                    {
                        var pn = pathname.startsWith('/') ? pathname.substring(1) : pathname;
                        a.push(pn);
                        console.log(`Adding ${pn} to assets.json.`);
                    }
                });
                compilation.deleteAsset('assets.json');
                compilation.emitAsset('assets.json', new sources.RawSource(JSON.stringify({files:a})));
            });
        });
    }
}
