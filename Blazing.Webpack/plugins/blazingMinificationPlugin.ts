import fs from 'fs/promises';
import path from 'path';

import webpack from 'webpack';

export default class BlazingMinificationPlugin
{
    apply(compiler: webpack.Compiler)
    {
        compiler.hooks.compilation.tap('BlazingMinificationPlugin', compilation =>
        {
            compilation.hooks.processAssets.tapPromise({
                name: 'BlazingMinificationPlugin',
                stage: webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE,
                additionalAssets: true,
            }, async assets =>
            {
                const sources = compilation.compiler.webpack.sources;
                
                var ents = Object.entries(assets);
                for (var x = 0; x < ents.length; x++)
                {
                    // This all needs to be replaced by mime types in future.
                    var pathname = ents[x][0];
                    if (pathname.endsWith('.css'))
                    {
                        var newcss: string = '';
                        var css: string | string[] = ents[x][1].buffer().toString();
                        css = css.split('\n');
                        for (const line of css)
                        {
                            if (line.includes('url('))
                            {
                                if (line.includes('.woff2') || line.includes('.woff'))
                                {
                                    var lineSplit = line.split(',');
                                    newcss += line.substring(0, line.indexOf('url('));
                                    for (var i = 0; i < lineSplit.length; i++)
                                    {
                                        var split = lineSplit[i];
                                        const lineprefix = split.substring(0, split.indexOf('url(') + 4);
                                        const linesuffix = lineprefix.substring(lineprefix.indexOf(')'));
                                        const url = split.substring(split.indexOf('url(') + 4, split.indexOf(')'));

                                        const contextPath = compiler.outputPath.replace('wwwroot', 'wwwroot-dev');
                                        const dataPath = url.includes('bootstrap-icons.woff2') || url.includes('bootstrap-icons.woff') ?
                                            path.resolve(contextPath, 'node_modules', `bootstrap-ic${url.startsWith('/') ? url.substring(1) : url}`) :
                                            path.resolve(contextPath, url.startsWith('/') ? `font\\${url.substring(1)}` : `font\\${url}`);
                                        newcss += `url(data:font/woff2;charset=utf-8;base64,${await fs.readFile(dataPath, { encoding: 'base64' })})${i == lineSplit.length - 1 ? '' : ','}`;
                                    }
                                    const endingUrlLine = line.substring(line.lastIndexOf('url(') + 4);
                                    newcss += `${endingUrlLine.substring(endingUrlLine.indexOf(')') + 1)}\n`;
                                }
                            }
                            else newcss += `${line}\n`
                        }
                        compilation.deleteAsset('0.css');
                        compilation.emitAsset('0.css', new sources.RawSource(newcss));
                    }
                }
            });
        });
    }
}
