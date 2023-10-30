const crypto = require('crypto');
const path = require('path');
const fs = require('fs/promises');

const sharp = require('sharp');
const sizeOf = require('image-size');

const intl = new Intl.NumberFormat('en-IN', { maximumSignificantDigits: 3 });
const maxWidthHeight = 3840;
const byteMaxSize = process.env.NODE_ENV === 'production' ? 100000 : 1000000;

var caches: string[] = [];
import webpack from 'webpack';

export default class BlazingMediaMinificationPlugin {
    apply(compiler: webpack.Compiler) {
        compiler.hooks.compilation.tap('BlazingMediaMinificationPlugin', compilation => {
            compilation.hooks.processAssets.tap({
                name: 'BlazingMediaMinificationPlugin',
                stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
            }, assets => {
                const sources = compilation.compiler.webpack.sources;

                Object.entries(assets).forEach(([pathname, source]) => {
                    //const assetInfo = compilation.assetsInfo.get(pathname);

                    if (pathname.endsWith('.png') && pathname.startsWith('img/')) {
                        const imgSize = sizeOf(source.buffer());

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
                                    }
                                    else {
                                        if (imgSize.height > max) img.resize(Math.floor(imgSize.width * ratio), max);
                                        if (imgSize.width > max) img.resize(max, Math.floor(imgSize.height * ratio));
                                    }
                                }

                                for (var y = 0; y < 15; y++) {
                                    qualityDecrement = y;
                                    img.avif({ quality: 100 - (y * 5), effort: process.env.NODE_ENV === 'production' ? 6 : 0 })
                                    img.toBuffer({ resolveWithObject: true }, (err: any, buffer: any, info: any) => avif = buffer);
                                    if (avif && avif.byteLength <= byteMaxSize) break;
                                }
                                if (avif && avif.byteLength <= byteMaxSize) break;
                            }

                            img.webp({ quality: 100 - (qualityDecrement * 5), effort: process.env.NODE_ENV === 'production' ? 6 : 0 })
                            img.toBuffer({ resolveWithObject: true }, (err: any, buffer: any, info: any) => webp = buffer);

                            // TODO: Need to find a way to get around Sharp being exclusively async since it cannot be used here.

                            if (avif && webp) { // This should never fail but it makes the analyser happy.
                                compilation.deleteAsset(pathname);
                                compilation.emitAsset(pathname.replace('.png', '.avif'), new sources.RawSource(avif));
                                compilation.emitAsset(pathname.replace('.png', '.webp'), new sources.RawSource(webp));
                            }
                        }
                    }
                });
            });
        });
    }
}
