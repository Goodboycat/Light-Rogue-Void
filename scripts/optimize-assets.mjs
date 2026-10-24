#!/usr/bin/env node
/**
 * Asset Optimization Script for Light Rogue Void
 *
 * Cuts first-load weight:
 * 1. Region backgrounds (src/assets/images/*.jpg) -> WebP 1280px q70 (~100-180 KB each)
 * 2. Audio tracks (public/audio/*.mp3) -> 96 kbps (mono for ambience)
 *
 * Usage:
 *   node scripts/optimize-assets.mjs [--apply]
 *
 * If `sharp` is installed, converts background images in-place or to .webp.
 * Otherwise, prints the exact CLI commands (`cwebp` / `ffmpeg`) to run on your machine.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname( __filename);
const ROOT = path.resolve(__dirname, '..');

const IMAGES_DIR = path.join(ROOT, 'src', 'assets', 'images');
const AUDIO_DIR = path.join(ROOT, 'public', 'audio');

const AMBIENCE_TRACKS = new Set([
    'origin-fields.mp3',
    'whispering-grove.mp3',
    'void-wastes.mp3',
    'seam-of-the-void.mp3',
]);

async function main() {
    const apply = process.argv.includes('--apply');
    let sharpLib = null;

    try {
        const mod = await import('sharp');
        sharpLib = mod.default || mod;
    } catch {
        sharpLib = null;
    }

    console.log('=== Light Rogue Void Asset Optimizer ===');
    console.log(`Mode: ${apply ? 'APPLY' : 'DRY-RUN / CLI COMMANDS'}`);
    console.log(`sharp available: ${sharpLib ? 'YES' : 'NO (printing CLI commands)'}\n`);

    // 1. Background Images -> WebP 1280px q70
    if (fs.existsSync(IMAGES_DIR)) {
        const files = fs.readdirSync(IMAGES_DIR).filter((f) => /\.(jpe?g|png)$/i.test(f));
        console.log(`Found ${files.length} background images in src/assets/images:`);
        for (const file of files) {
            const inputPath = path.join(IMAGES_DIR, file);
            const webpPath = path.join(IMAGES_DIR, file.replace(/\.(jpe?g|png)$/i, '.webp'));
            const stat = fs.statSync(inputPath);
            const kb = Math.round(stat.size / 1024);

            if (sharpLib && apply) {
                await sharpLib(inputPath)
                    .resize({ width: 1280, withoutEnlargement: true })
                    .webp({ quality: 70 })
                    .toFile(webpPath);
                const newStat = fs.statSync(webpPath);
                console.log(
                    `  [OK] ${file} (${kb} KB) -> ${path.basename(webpPath)} (${Math.round(
                        newStat.size / 1024
                    )} KB)`
                );
            } else {
                console.log(
                    `  # ${file} (${kb} KB) -> ~120 KB WebP 1280px q70:\n` +
                        `  cwebp -q 70 -resize 1280 0 "${inputPath}" -o "${webpPath}"`
                );
            }
        }
    }

    console.log('');

    // 2. Audio Tracks -> 96 kbps (mono for ambience)
    if (fs.existsSync(AUDIO_DIR)) {
        const tracks = fs.readdirSync(AUDIO_DIR).filter((f) => /\.mp3$/i.test(f));
        console.log(`Found ${tracks.length} audio tracks in public/audio:`);
        for (const track of tracks) {
            const inputPath = path.join(AUDIO_DIR, track);
            const tempPath = path.join(AUDIO_DIR, `opt_${track}`);
            const stat = fs.statSync(inputPath);
            const kb = Math.round(stat.size / 1024);
            const isAmbience = AMBIENCE_TRACKS.has(track);
            const channelsFlag = isAmbience ? '-ac 1' : '-ac 2';

            console.log(
                `  # ${track} (${kb} KB) -> 96 kbps ${isAmbience ? 'mono' : 'stereo'}:\n` +
                    `  ffmpeg -y -i "${inputPath}" -codec:a libmp3lame -b:a 96k ${channelsFlag} "${tempPath}" && mv "${tempPath}" "${inputPath}"`
            );
        }
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
