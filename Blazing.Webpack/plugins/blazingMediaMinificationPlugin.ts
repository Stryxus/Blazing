import crypto from 'crypto';

import sharp, { OutputInfo } from 'sharp';
import sizeOf from 'image-size';

const dev = process.env.NODE_ENV === 'development';
const intl = new Intl.NumberFormat('en-IN', { maximumSignificantDigits: 3 });
const maxWidthHeight = 3840;
const byteMaxSize = dev ? 1000000 : 100000;

var caches: string[] = [];
import webpack from 'webpack';

export default class BlazingMediaMinificationPlugin {
    apply(compiler: webpack.Compiler) {
        compiler.hooks.compilation.tap('BlazingMediaMinificationPlugin', compilation => {
            compilation.hooks.processAssets.tapPromise({
                name: 'BlazingMediaMinificationPlugin',
                stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
            }, async assets => {
                const sources = compilation.compiler.webpack.sources;

                for (const [pathname, source] of Object.entries(assets)) {
                    const assetInfo = compilation.assetsInfo.get(pathname);

                    if (assetInfo && assetInfo.sourceFilename && pathname.endsWith('.png') && assetInfo.sourceFilename.startsWith('img/')) {
                        const imgSize = sizeOf(source.buffer());

                        if (imgSize && imgSize.width && imgSize.height) {
                            const hash = crypto.createHash('sha1');
                            hash.setEncoding('hex');
                            hash.write(source.buffer());
                            hash.end();

                            const sha1 = hash.read();
                            if (caches.length >= 100000) caches = [];
                            if (!caches.includes(sha1)) {
                                caches.push(sha1);

                                var avif: Buffer | undefined;
                                var webp: Buffer | undefined;
                                const img = sharp(source.buffer());
                                const ratio = Math.min(maxWidthHeight / imgSize.width, maxWidthHeight / imgSize.height);
                                var qualityDecrement = 0;
                                for (var x = 1; x > 0; x -= 0.25) {
                                    let max = Math.floor(maxWidthHeight * x);

                                    if (x < 1) {
                                        if (imgSize.height > imgSize.width) {
                                            if (imgSize.width > max) img.resize(max, Math.floor(imgSize.height * ratio));
                                            if (imgSize.height > max) img.resize(Math.floor(imgSize.width * ratio), max);
                                        } else {
                                            if (imgSize.height > max) img.resize(Math.floor(imgSize.width * ratio), max);
                                            if (imgSize.width > max) img.resize(max, Math.floor(imgSize.height * ratio));
                                        }
                                    }

                                    for (var y = 0; y < (dev ? 15 : 30); y++) {
                                        qualityDecrement = y;
                                        img.avif({ quality: 100 - (y * (dev ? 5 : 2)), effort: dev ? 0 : 6 })
                                        avif = await img.toBuffer();
                                        if (avif && avif.byteLength <= byteMaxSize) break;
                                    }
                                    if (avif && avif.byteLength <= byteMaxSize) break;
                                }

                                img.webp({ quality: 100 - (qualityDecrement * 5), effort: dev ? 0 : 6 })
                                webp = await img.toBuffer();

                                if (avif && webp) { // This should never fail but it makes the analyser happy.
                                    compilation.deleteAsset(pathname);
                                    compilation.emitAsset(pathname.replace('.png', '.avif'), new sources.RawSource(avif));
                                    compilation.emitAsset(pathname.replace('.png', '.webp'), new sources.RawSource(webp));
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
