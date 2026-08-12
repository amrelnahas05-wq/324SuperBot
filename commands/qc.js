const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const axios = require('axios');
const sharp = require('sharp');
const webp = require('node-webpmux');
const settings = require('../settings');
const getFakeVcard = require('../lib/fakeVcard');

const CANVAS = 512;
const PADDING = 28;
const AVATAR_SIZE = 76;
const MAX_TEXT_WIDTH = CANVAS - PADDING * 2 - AVATAR_SIZE - 20;

function unwrapMessage(message) {
    return message?.ephemeralMessage?.message
        || message?.viewOnceMessage?.message
        || message?.viewOnceMessageV2?.message
        || message;
}

function getQuotedInfo(message) {
    const currentMessage = unwrapMessage(message?.message);
    const ctx = currentMessage?.extendedTextMessage?.contextInfo
        || currentMessage?.imageMessage?.contextInfo
        || currentMessage?.videoMessage?.contextInfo;
    if (!ctx?.quotedMessage) return null;

    const quotedMsg = unwrapMessage(ctx.quotedMessage);
    const text = quotedMsg?.conversation
        || quotedMsg?.extendedTextMessage?.text
        || quotedMsg?.imageMessage?.caption
        || quotedMsg?.videoMessage?.caption
        || quotedMsg?.documentMessage?.caption
        || '';

    return {
        participant: ctx.participant || quotedMsg?.contextInfo?.participant,
        text: String(text).trim(),
    };
}

function jidFallback(jid) {
    return String(jid || '').split('@')[0].split(':')[0] || 'Unknown';
}

async function resolveDisplayName(sock, chatId, participant) {
    if (!participant) return 'Unknown';
    try {
        if (chatId.endsWith('@g.us')) {
            const metadata = await sock.groupMetadata(chatId);
            const member = metadata?.participants?.find((item) => item.id === participant);
            const name = member?.name || member?.notify || member?.vcardName;
            if (name) return name;
        }
    } catch (error) {
        console.error('qc participant lookup failed:', error.message);
    }
    return jidFallback(participant);
}

function escapeXml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function wrapUnicodeText(text, maxCharacters = 30) {
    const words = String(text || '(no text content)').trim().split(/\s+/);
    const lines = [];
    let current = '';
    for (const word of words) {
        const attempt = current ? `${current} ${word}` : word;
        if ([...attempt].length > maxCharacters && current) {
            lines.push(current);
            current = word;
        } else {
            current = attempt;
        }
    }
    if (current) lines.push(current);
    return lines.slice(0, 14);
}

async function buildQuoteImage({ displayName, avatarBuffer, text }) {
    const textLines = wrapUnicodeText(text);
    const lineHeight = 24;
    const nameHeight = 26;
    const bubbleHeight = Math.min(
        CANVAS - PADDING * 2,
        nameHeight + textLines.length * lineHeight + PADDING
    );
    const bubbleY = Math.max(PADDING, (CANVAS - bubbleHeight) / 2);
    const bubbleX = PADDING + AVATAR_SIZE + 16;
    const bubbleWidth = CANVAS - bubbleX - PADDING;
    const safeName = escapeXml(displayName || 'Unknown');
    const safeLines = textLines.map(escapeXml);
    const textDirection = /[\u0590-\u08FF]/.test(text || '') ? 'rtl' : 'ltr';
    const textAnchor = textDirection === 'rtl' ? 'end' : 'start';
    const textX = textDirection === 'rtl' ? bubbleX + bubbleWidth - 16 : bubbleX + 16;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}">
      <rect width="${CANVAS}" height="${CANVAS}" fill="#000000" fill-opacity="0"/>
      <circle cx="${PADDING + AVATAR_SIZE / 2}" cy="${bubbleY + AVATAR_SIZE / 2}" r="${AVATAR_SIZE / 2}" fill="#555555"/>
      <rect x="${bubbleX}" y="${bubbleY}" width="${bubbleWidth}" height="${bubbleHeight}" rx="18" fill="#1e1e1e"/>
      <text x="${textX}" y="${bubbleY + 25}" fill="white" font-size="16" font-family="Noto Sans Arabic, Noto Sans, sans-serif" text-anchor="${textAnchor}" direction="${textDirection}">${safeName}</text>
      ${safeLines.map((line, index) => `<text x="${textX}" y="${bubbleY + 25 + nameHeight + (index + 1) * lineHeight}" fill="white" font-size="16" font-family="Noto Sans Arabic, Noto Sans, sans-serif" text-anchor="${textAnchor}" direction="${textDirection}">${line}</text>`).join('')}
    </svg>`;

    let pipeline = sharp(Buffer.from(svg)).png();
    if (avatarBuffer) {
        try {
            const avatar = await sharp(avatarBuffer)
                .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover' })
                .png()
                .toBuffer();
            pipeline = sharp(Buffer.from(svg)).composite([{ input: avatar, left: PADDING, top: Math.round(bubbleY) }]).png();
        } catch (_) {
            // Keep the generated placeholder avatar if the profile image is unavailable.
        }
    }
    return pipeline.toBuffer();
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

        let displayName = await resolveDisplayName(sock, chatId, quoted.participant);
        let avatarBuffer = null;
        if (quoted.participant) {
            try {
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
