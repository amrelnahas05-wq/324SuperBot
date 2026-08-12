const getFakeVcard = require('../lib/fakeVcard');

const VOICY_API_URL = 'https://api.voicy.network/v1/clips';
const MAX_QUERY_LENGTH = 100;
const MAX_AUDIO_SIZE = 15 * 1024 * 1024;

function cleanFileName(name = 'voicy-meme') {
    return String(name)
        .replace(/[^a-z0-9-_]+/gi, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 80) || 'voicy-meme';
}

function getClipList(data) {
    return data?.Clips || data?.clips || data?.data?.Clips || data?.data?.clips || [];
}

function getClipField(clip, ...names) {
    for (const name of names) {
        if (clip?.[name]) return clip[name];
    }
    return null;
}

function audioExtension(contentType) {
    const mime = String(contentType || '').split(';')[0].trim().toLowerCase();
    if (mime === 'audio/ogg' || mime === 'audio/opus') return 'ogg';
    if (mime === 'audio/wav' || mime === 'audio/x-wav') return 'wav';
    if (mime === 'audio/mp4' || mime === 'audio/aac') return 'm4a';
    if (mime === 'audio/webm') return 'webm';
    return 'mp3';
}

async function reactIfPossible(sock, chatId, message, emoji) {
    if (!message?.key) return;
    try {
        await sock.sendMessage(chatId, { react: { text: emoji, key: message.key } });
    } catch (error) {
        console.warn('.smeme reaction failed:', error.message);
    }
}

// The bot dispatcher calls handlers as (sock, chatId, message, query).
module.exports = async function smemeCommand(sock, chatId, message, text) {
    const apiKey = String(process.env.VOICY_API_KEY || '').trim();
    if (!apiKey) {
        return sock.sendMessage(chatId, {
            text: '❌ .smeme is not configured yet. The bot owner must add a valid `VOICY_API_KEY` Railway variable, then redeploy the bot.'
        }, { quoted: getFakeVcard() });
    }

    const query = String(text || '').trim().slice(0, MAX_QUERY_LENGTH) || 'meme';

    try {
        await reactIfPossible(sock, chatId, message, '🔎');

        const searchUrl = new URL(VOICY_API_URL);
        searchUrl.search = new URLSearchParams({
            type: '98',
            value: '',
            quantity: '8',
            search: query,
            sort: '2'
        });

        const searchResponse = await fetch(searchUrl, {
            headers: { 'X-API-KEY': apiKey, Accept: 'application/json' },
            signal: AbortSignal.timeout(15000)
        });
        if (searchResponse.status === 401 || searchResponse.status === 403) {
            throw new Error('Voicy rejected VOICY_API_KEY');
        }
        if (!searchResponse.ok) {
            throw new Error(`Voicy search failed with HTTP ${searchResponse.status}`);
        }

        const searchData = await searchResponse.json();
        if (searchData?.Error) {
            throw new Error(searchData.ErrorMessage || 'Voicy returned an API error');
        }

        const clips = getClipList(searchData).filter((clip) => {
            const sound = getClipField(clip, 'Sound', 'sound', 'Audio', 'audio', 'Url', 'url');
            return typeof sound === 'string' && /^https?:\/\//i.test(sound);
        });

        if (!clips.length) {
            return sock.sendMessage(chatId, {
                text: `❌ No Voicy sound was found for: *${query}*\n\nTry a shorter search, such as \`.smeme bruh\` or \`.smeme vine boom\`.`
            }, { quoted: message || getFakeVcard() });
        }

        const clip = clips[Math.floor(Math.random() * clips.length)];
        const soundUrl = getClipField(clip, 'Sound', 'sound', 'Audio', 'audio', 'Url', 'url');
        const title = getClipField(clip, 'Name', 'name', 'Title', 'title') || 'Meme sound';

        const audioResponse = await fetch(soundUrl, {
            headers: { Accept: 'audio/*,*/*;q=0.8' },
            signal: AbortSignal.timeout(20000)
        });
        if (!audioResponse.ok) {
            throw new Error(`Voicy audio download failed with HTTP ${audioResponse.status}`);
        }

        const contentType = String(audioResponse.headers.get('content-type') || 'audio/mpeg').split(';')[0].trim().toLowerCase();
        if (!contentType.startsWith('audio/')) {
            throw new Error(`Voicy returned unsupported media type: ${contentType || 'unknown'}`);
        }

        const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
        if (!audioBuffer.length) throw new Error('Voicy returned an empty audio file');
        if (audioBuffer.length > MAX_AUDIO_SIZE) throw new Error('Voicy audio exceeds the 15 MB limit');

        await sock.sendMessage(chatId, {
            audio: audioBuffer,
            mimetype: contentType,
            fileName: `${cleanFileName(title)}.${audioExtension(contentType)}`,
            ptt: false
        }, { quoted: message || getFakeVcard() });

        await reactIfPossible(sock, chatId, message, '✅');
    } catch (error) {
        const details = error.message || 'Unknown error';
        console.error('.smeme error:', details);
        const keyProblem = /rejected VOICY_API_KEY/i.test(details);
        await sock.sendMessage(chatId, {
            text: keyProblem
                ? '❌ Voicy rejected `VOICY_API_KEY`. The bot owner should replace the value in Railway and redeploy.'
                : '❌ I could not fetch a meme sound right now. Please try again later.'
        }, { quoted: message || getFakeVcard() });
        await reactIfPossible(sock, chatId, message, '❌');
    }
};

module.exports.help = '`.smeme [search words]` — search Voicy and send a meme sound';
module.exports.tags = ['media'];
module.exports.command = ['smeme'];
module.exports.alias = ['smeme'];
