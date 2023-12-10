import fs from 'fs';

import webpack, { AssetInfo } from 'webpack';
import sharp from 'sharp';
import sizeOf from 'image-size';
import { ISizeCalculationResult } from 'image-size/dist/types/interface';

import { Log } from '../utils';

const dev = process.env.NODE_ENV !== 'production';
var caches: Map<string, Buffer[]> = new Map<string, Buffer[]>();

export default class BlazingMediaMinificationPlugin {
    apply(compiler: webpack.Compiler) {
        compiler.hooks.compilation.tap('BlazingMediaMinificationPlugin', compilation =>
        {
            compilation.hooks.optimizeAssets.tapPromise({
                name: 'BlazingMediaMinificationPlugin',
                stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
            }, async assets =>
            {
                const sources = compilation.compiler.webpack.sources;
                for (const [pathname, source] of Object.entries(assets))
                {
                    const assetInfo: AssetInfo | undefined = compilation.assetsInfo.get(pathname);
                    if (assetInfo && assetInfo.sourceFilename && pathname.endsWith('.png') && assetInfo.sourceFilename.startsWith('img/'))
                    {
                        const imgSize: ISizeCalculationResult = sizeOf(source.buffer());
                        if (imgSize && imgSize.width && imgSize.height) {

                            var avif: Buffer | undefined;
                            var webp: Buffer | undefined;
                            const img = sharp(source.buffer());

                            await resize(assetInfo, img, imgSize.width, imgSize.height);
                            avif = await transcode(assetInfo, img, Format.AVIF);
                            webp = await transcode(assetInfo, img, Format.WEBP);

                            if (avif && webp) // This should never fail but it makes the analyser happy.
                            {
                                caches.set(pathname, [avif, webp]);
                                for (const [key, val] of caches)
                                {
                                    if (fs.existsSync(key))
                                    {
                                        compilation.deleteAsset(key);
                                        compilation.emitAsset(key.replace('.png', '.avif'), new sources.RawSource(val[0]));
                                        compilation.emitAsset(key.replace('.png', '.webp'), new sources.RawSource(val[1]));
                                    }
                                    else caches.delete(key);
                                }
                            }
                        } else {
                            console.error('For some reason, the image\'s width and height could not be retreived!');
                        }
                    }
                }
            });
        });
    }
}

enum Format
{
    AVIF = 'AVIF',
    WEBP = 'WebP',
}

async function resize(asset: AssetInfo, img: sharp.Sharp, width: number, height: number)
{
    const maxWidthHeight = 3840;
    const byteMaxSize = 1000000;
    const ratio = Math.min(maxWidthHeight / width, maxWidthHeight / height);
    var buf: Buffer | undefined;
    var currentWidth = width;
    var currentHeight = height;
    
    if (width > maxWidthHeight || height > maxWidthHeight) internalResize(maxWidthHeight);
    if ((buf = await img.toBuffer()).byteLength > byteMaxSize)
    {
        for (var x = 0.9; x < 0.1; x -= 0.1)
        {
            let max = Math.floor(maxWidthHeight * x);
            internalResize(max);
            if ((buf = await img.toBuffer()).byteLength <= byteMaxSize) break;
        }
    }

    async function internalResize(max: number)
    {
        if (currentWidth > currentHeight)
        {
            widthResize();
            heightResize();
        }
        else
        {
            heightResize();
            widthResize();
        }

        var previousWidth;
        var previousHeight;

        async function widthResize()
        {
            if (currentWidth > max)
            {
                previousWidth = currentWidth;
                previousHeight = currentHeight;
                img.resize(currentWidth = max, currentHeight = Math.floor(height * ratio));
                console.log(`Resized Image: ${Log.fg.yellow}${asset.sourceFilename}${Log.reset} from ${Log.fg.red}${previousWidth}x${previousHeight}${Log.reset}` +
                    ` to ${Log.fg.green}${currentWidth}x${currentHeight} [${((await img.toBuffer()).byteLength / 1000).toLocaleString(undefined, { minimumFractionDigits: 3 })} KB]${Log.reset}.`);
            }
        }

        async function heightResize()
        {
            if (currentHeight > max)
            {
                previousWidth = currentWidth;
                previousHeight = currentHeight;
                img.resize(currentWidth = Math.floor(width * ratio), currentHeight = max);
                console.log(`Resized Image: ${Log.fg.yellow}${asset.sourceFilename}${Log.reset} from ${Log.fg.red}${previousWidth}x${previousHeight}${Log.reset}` +
                    ` to ${Log.fg.green}${currentWidth}x${currentHeight} [${((await img.toBuffer()).byteLength / 1000).toLocaleString(undefined, { minimumFractionDigits: 3 })} KB]${Log.reset}.`);
            }
        }
    }
}

async function transcode(asset: AssetInfo, img: sharp.Sharp, form: Format): Promise<Buffer | undefined>
{
    const byteMaxSize = 100000;
    var buf: Buffer | undefined;
    
    for (var y = 0; y < (dev ? 3 : 12); y++)
    {
        var quality = 90 - y * (dev ? 10 : 4);
        switch (form)
        {
            case Format.AVIF:
                img.avif({ quality: quality, effort: dev ? 0 : 6 });
                break;
            case Format.WEBP:
                img.webp({ quality: quality, effort: dev ? 0 : 6 });
                break;
        }
        buf = await img.toBuffer();
        console.log(`Transcoded Image: ${Log.fg.yellow}${asset.sourceFilename}${Log.reset}` +
            ` to ${Log.fg.green}${form.toString()}${Log.reset} at quality ${Log.fg.green}${quality}% [${(buf.byteLength / 1000).toLocaleString(undefined, { minimumFractionDigits: 3 })} KB]${Log.reset}.`);
        if (buf && buf.byteLength <= byteMaxSize) break;
    }
    if (buf && buf.byteLength <= byteMaxSize) return buf;
    return buf;
}
