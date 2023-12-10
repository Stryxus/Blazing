import webpack from 'webpack';

export default class BlazingCachePlugin {
    apply(compiler: webpack.Compiler) {
        compiler.hooks.compilation.tap('BlazingCachePlugin', compilation =>
        {
            compilation.hooks.afterProcessAssets.tap({
                name: 'BlazingCachePlugin',
                stage: webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE,
            }, assets =>
            {
                const sources = compilation.compiler.webpack.sources;

                var a: any = [];
                var ents = Object.entries(assets);
                var currentObfuscationNumber = 0;
                for (var x = 0; x < ents.length; x++)
                {
                    // This all needs to be replaced by mime types in future.
                    var pathname = ents[x][0];
                    if (pathname !== 'assets.json' &&
                        !pathname.endsWith('.html') &&
                        !pathname.endsWith('.js') &&
                        !pathname.endsWith('.css') &&
                        !pathname.endsWith('.woff2') &&
                        (!pathname.includes('/img') && !pathname.endsWith('.png')))
                    {
                        var newpathname = currentObfuscationNumber++;
                        compilation.renameAsset(pathname, `${newpathname}${pathname.substring(pathname.lastIndexOf('.'))}`);

                        pathname = pathname.startsWith('/') ? pathname.substring(1) : pathname;
                        var pn: string[] = [pathname];
                        if (pathname.endsWith('.avif') || pathname.endsWith('.webp'))
                        {
                            var nextEnt = ents[x + 1][0];
                            nextEnt = nextEnt.startsWith('/') ? nextEnt.substring(1) : nextEnt;
                            pn = [pathname, newpathname.toString()];
                            if (nextEnt.endsWith('.webp'))
                            {
                                var webp = [nextEnt.replace('.avif', '.webp'), newpathname.toString()];
                                compilation.renameAsset(`/${nextEnt.replace('.avif', '.webp')}`, `${newpathname}${pathname.substring(pathname.lastIndexOf('.')).replace('.avif', '.webp')}`);
                                a.push(webp);
                                x++;
                            }
                        }
                        else pn = [pathname, newpathname.toString()];
                        a.push(pn);
                    }
                }
                compilation.deleteAsset('assets.json');
                compilation.emitAsset('assets.json', new sources.RawSource(JSON.stringify({ files: a })));
                console.log(`Updated caches in assets.json.`);
            });
        });
    }
}
