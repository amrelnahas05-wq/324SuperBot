const fs = require('fs');
const os = require('os');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const getFakeVcard = require('../lib/fakeVcard');

// Presets trade quality for file size. CRF is libx264's quality scale (lower = better/larger).
const PRESETS = {
    low: { crf: 32, scale: '640:-2', label: 'low (smallest file)' },
    medium: { crf: 28, scale: '854:-2', label: 'medium (balanced)' },
    high: { crf: 24, scale: '1280:-2', label: 'high (best quality)' },
};

function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB'];
    let value = bytes;
    let unitIndex = -1;
    do {
        value /= 1024;
        unitIndex++;
    } while (value >= 1024 && unitIndex < units.length - 1);
    return `${value.toFixed(2)} ${units[unitIndex]}`;
}

function getQuotedVideo(message) {
    const ctx = message.message?.extendedTextMessage?.contextInfo;
    const quoted = ctx?.quotedMessage;
    if (quoted?.videoMessage) return quoted.videoMessage;
    if (message.message?.videoMessage) return message.message.videoMessage;
    return null;
}

async function compressCommand(sock, chatId, message, args = []) {
    const videoMessage = getQuotedVideo(message);
    const presetName = String(args[0] || 'medium').toLowerCase();
    const preset = PRESETS[presetName];

    if (!videoMessage) {
        await sock.sendMessage(chatId, {
            text: '❌ Reply to a video with `.compress <level>`.\n\n' +
                `Levels: ${Object.keys(PRESETS).join(', ')} (default: medium)\n` +
                'Example: `.compress low`',
        }, { quoted: getFakeVcard() });
        return;
    }

    if (!preset) {
        await sock.sendMessage(chatId, {
            text: `❌ Unknown level: ${presetName}\n\nLevels: ${Object.keys(PRESETS).join(', ')}`,
        }, { quoted: getFakeVcard() });
        return;
    }

    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), '324bot-compress-'));
    const inputFile = path.join(workDir, 'input.mp4');
    const outputFile = path.join(workDir, 'output.mp4');

    try {
        await sock.sendMessage(chatId, { react: { text: '📦', key: message.key } });

        const stream = await downloadContentFromMessage(videoMessage, 'video');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const inputBuffer = Buffer.concat(chunks);
        fs.writeFileSync(inputFile, inputBuffer);
        const originalSize = inputBuffer.length;

        await new Promise((resolve, reject) => {
            ffmpeg(inputFile)
                .videoFilters(`scale=${preset.scale}`)
                .videoCodec('libx264')
                .outputOptions([`-crf ${preset.crf}`, '-preset veryfast', '-movflags +faststart'])
                .audioCodec('aac')
                .audioBitrate('96k')
                .format('mp4')
                .on('end', resolve)
                .on('error', reject)
                .save(outputFile);
        });

        const outputBuffer = fs.readFileSync(outputFile);
        const compressedSize = outputBuffer.length;
        const savedPct = originalSize > 0
            ? Math.max(0, Math.round((1 - compressedSize / originalSize) * 100))
            : 0;

        await sock.sendMessage(chatId, {
            video: outputBuffer,
            caption: `📦 Compressed (${preset.label})\n` +
                `${formatSize(originalSize)} → ${formatSize(compressedSize)} (${savedPct}% smaller)`,
        }, { quoted: getFakeVcard() });
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
    } catch (error) {
        console.error('compress error:', error);
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
        await sock.sendMessage(chatId, {
            text: '❌ Failed to compress that video. Make sure it is a valid video and try again.',
        }, { quoted: getFakeVcard() });
    } finally {
        fs.rmSync(workDir, { recursive: true, force: true });
    }
}

module.exports = compressCommand;
