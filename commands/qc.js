const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const axios = require('axios');
const { Jimp, loadFont, measureText, rgbaToInt } = require('jimp');
const jimpFonts = require('jimp/fonts');
const webp = require('node-webpmux');
const settings = require('../settings');
const getFakeVcard = require('../lib/fakeVcard');

const CANVAS = 512;
const PADDING = 28;
const AVATAR_SIZE = 76;
const MAX_TEXT_WIDTH = CANVAS - PADDING * 2 - AVATAR_SIZE - 20;

function getQuotedInfo(message) {
    const ctx = message.message?.extendedTextMessage?.contextInfo;
    if (!ctx?.quotedMessage) return null;

    const quotedMsg = ctx.quotedMessage;
    const text = quotedMsg.conversation
        || quotedMsg.extendedTextMessage?.text
        || quotedMsg.imageMessage?.caption
        || quotedMsg.videoMessage?.caption
        || '';

    return {
        participant: ctx.participant,
        text: text.trim(),
    };
}

function wrapText(font, text, maxWidth) {
    const words = text.split(/\s+/);
    const lines = [];
    let current = '';

    for (const word of words) {
        const attempt = current ? `${current} ${word}` : word;
        const width = measureText(font, attempt);
        if (width > maxWidth && current) {
            lines.push(current);
            current = word;
        } else {
            current = attempt;
        }
    }
    if (current) lines.push(current);
    return lines;
}

async function buildQuoteImage({ displayName, avatarBuffer, text }) {
    const image = new Jimp({ width: CANVAS, height: CANVAS, color: 0x00000000 });

    const bubbleColor = rgbaToInt(30, 30, 30, 255);

    const fontName = await loadFont(jimpFonts.SANS_16_WHITE);
    const fontText = await loadFont(jimpFonts.SANS_16_WHITE);

    // Avatar (circular crop)
    let avatar;
    try {
        avatar = await Jimp.read(avatarBuffer);
    } catch (_) {
        avatar = new Jimp({ width: AVATAR_SIZE, height: AVATAR_SIZE, color: 0x555555ff });
    }
    avatar.cover({ w: AVATAR_SIZE, h: AVATAR_SIZE });
    avatar.mask(buildCircleMask(AVATAR_SIZE), 0, 0);

    const textLines = wrapText(fontText, text || '(no text content)', MAX_TEXT_WIDTH);
    const lineHeight = 22;
    const nameHeight = 24;
    const bubbleHeight = Math.min(
        CANVAS - PADDING * 2,
        nameHeight + textLines.length * lineHeight + PADDING
    );
    const bubbleY = Math.max(PADDING, (CANVAS - bubbleHeight) / 2);

    const bubbleX = PADDING + AVATAR_SIZE + 16;
    const bubbleWidth = CANVAS - bubbleX - PADDING;

    // Draw bubble background
    const bubble = new Jimp({ width: bubbleWidth, height: bubbleHeight, color: bubbleColor });
    image.composite(bubble, bubbleX, bubbleY);
    image.composite(avatar, PADDING, bubbleY);

    image.print({ font: fontName, x: bubbleX + 16, y: bubbleY + 8, text: displayName || 'Unknown' });
    let lineY = bubbleY + 8 + nameHeight;
    for (const line of textLines) {
        image.print({ font: fontText, x: bubbleX + 16, y: lineY, text: line });
        lineY += lineHeight;
    }

    return image.getBuffer('image/png');
}

function buildCircleMask(size) {
    // Jimp's mask() reads the mask image's RGB luminance (not alpha) as the multiplier,
    // so the mask itself must be drawn as white-inside/black-outside, fully opaque.
    const mask = new Jimp({ width: size, height: size, color: 0xffffffff });
    const radius = size / 2;
    mask.scan(0, 0, size, size, function (x, y, idx) {
        const dx = x - radius;
        const dy = y - radius;
        const inside = dx * dx + dy * dy <= radius * radius;
        const value = inside ? 255 : 0;
        this.bitmap.data[idx] = value;
        this.bitmap.data[idx + 1] = value;
        this.bitmap.data[idx + 2] = value;
    });
    return mask;
}

function runFfmpeg(inputPath, outputPath) {
    const cmd = `ffmpeg -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 80 -compression_level 6 "${outputPath}"`;
    return new Promise((resolve, reject) => {
        exec(cmd, (error) => (error ? reject(error) : resolve()));
    });
}

async function attachStickerMetadata(webpBuffer) {
    const img = new webp.Image();
    await img.load(webpBuffer);

    const json = {
        'sticker-pack-id': crypto.randomBytes(16).toString('hex'),
        'sticker-pack-name': settings.packname || 'ii324BOT',
        emojis: ['💬'],
    };
    const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
    const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
    const exif = Buffer.concat([exifAttr, jsonBuffer]);
    exif.writeUIntLE(jsonBuffer.length, 14, 4);
    img.exif = exif;

    return img.save(null);
}

async function qcCommand(sock, chatId, message) {
    const quoted = getQuotedInfo(message);

    if (!quoted) {
        await sock.sendMessage(chatId, {
            text: '❌ Reply to a text message with `.qc` to turn it into a quote sticker.',
        }, { quoted: getFakeVcard() });
        return;
    }

    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), '324bot-qc-'));
    const pngPath = path.join(workDir, 'quote.png');
    const webpPath = path.join(workDir, 'quote.webp');

    try {
        await sock.sendMessage(chatId, { react: { text: '💬', key: message.key } });

        let displayName = 'Unknown';
        let avatarBuffer = null;
        if (quoted.participant) {
            try {
                displayName = quoted.participant.split('@')[0];
                avatarBuffer = await sock.profilePictureUrl(quoted.participant, 'image')
                    .then((url) => axios.get(url, { responseType: 'arraybuffer' }))
                    .then((res) => Buffer.from(res.data));
            } catch (_) {
                avatarBuffer = null;
            }
        }

        const pngBuffer = await buildQuoteImage({
            displayName,
            avatarBuffer,
            text: quoted.text,
        });
        fs.writeFileSync(pngPath, pngBuffer);

        await runFfmpeg(pngPath, webpPath);
        const webpBuffer = fs.readFileSync(webpPath);
        const finalBuffer = await attachStickerMetadata(webpBuffer);

        await sock.sendMessage(chatId, { sticker: finalBuffer }, { quoted: message });
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
    } catch (error) {
        console.error('qc error:', error);
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
        await sock.sendMessage(chatId, {
            text: '❌ Failed to build the quote sticker. Try again.',
        }, { quoted: getFakeVcard() });
    } finally {
        fs.rmSync(workDir, { recursive: true, force: true });
    }
}

module.exports = qcCommand;
