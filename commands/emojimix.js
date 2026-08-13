const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);
const TENOR_API_KEY = process.env.TENOR_API_KEY || '';

async function emojimixCommand(sock, chatId, msg, text) {
    const tmpDir = path.join(process.cwd(), 'tmp');
    let tempFile;
    let outputFile;

    try {
        const hasDispatcherText = typeof text === 'string' && text.trim();
        const commandText = hasDispatcherText
            ? text.trim()
            : (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim();
        const args = (hasDispatcherText ? commandText : commandText.split(/\s+/).slice(1).join(' '))
            .trim()
            .split(/\s+/);

        if (!args[0]) {
            await sock.sendMessage(chatId, { text: '🎴 Example: .emojimix 😎+🥰' });
            return;
        }

        if (!args[0].includes('+')) {
            await sock.sendMessage(chatId, {
                text: '✳️ Separate the emojis with a *+* sign.\n\n📌 Example: *.emojimix* 😎+🥰',
            });
            return;
        }

        if (!TENOR_API_KEY) {
            await sock.sendMessage(chatId, { text: '❌ Emoji Mix is not configured. Ask the bot owner to set TENOR_API_KEY.' });
            return;
        }

        const [emoji1, emoji2] = args[0].split('+').map((entry) => entry.trim());
        if (!emoji1 || !emoji2) {
            await sock.sendMessage(chatId, { text: '❌ Please provide two emojis, for example: .emojimix 😎+🥰' });
            return;
        }

        const search = `${emoji1}_${emoji2}`;
        const url = new URL('https://tenor.googleapis.com/v2/featured');
        url.searchParams.set('key', TENOR_API_KEY);
        url.searchParams.set('contentfilter', 'high');
        url.searchParams.set('media_filter', 'png_transparent');
        url.searchParams.set('component', 'proactive');
        url.searchParams.set('collection', 'emoji_kitchen_v5');
        url.searchParams.set('q', search);

        const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error(`Tenor request failed with HTTP ${response.status}`);
        const data = await response.json();
        const imageUrl = data?.results?.[0]?.url;

        if (!imageUrl) {
            await sock.sendMessage(chatId, { text: '❌ These emojis cannot be mixed. Try a different pair.' });
            return;
        }

        const imageResponse = await fetch(imageUrl, { signal: AbortSignal.timeout(20000) });
        if (!imageResponse.ok) throw new Error(`Emoji image download failed with HTTP ${imageResponse.status}`);
        const buffer = Buffer.from(await imageResponse.arrayBuffer());
        if (!buffer.length) throw new Error('Emoji image download was empty');

        fs.mkdirSync(tmpDir, { recursive: true });
        const nonce = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
        tempFile = path.join(tmpDir, `emojimix_${nonce}.png`);
        outputFile = path.join(tmpDir, `emojimix_${nonce}.webp`);
        fs.writeFileSync(tempFile, buffer);

        await execFileAsync('ffmpeg', [
            '-y', '-i', tempFile,
            '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000',
            outputFile,
        ], { timeout: 30000 });

        const stickerBuffer = fs.readFileSync(outputFile);
        await sock.sendMessage(chatId, { sticker: stickerBuffer }, { quoted: msg });
    } catch (error) {
        console.error('[EMOJIMIX] Command failed:', error.message);
        await sock.sendMessage(chatId, {
            text: '❌ Failed to mix these emojis. Please try a different pair later.',
        });
    } finally {
        for (const file of [tempFile, outputFile]) {
            if (file && fs.existsSync(file)) {
                try { fs.unlinkSync(file); } catch (_) {}
            }
        }
    }
}

module.exports = emojimixCommand;
