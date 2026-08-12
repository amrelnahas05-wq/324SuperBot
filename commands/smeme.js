const getFakeVcard = require('../lib/fakeVcard');

const VOICY_API_URL = 'https://api.voicy.network/v1/clips';

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

module.exports = async function smemeCommand(sock, chatId, text, message) {
    const apiKey = process.env.VOICY_API_KEY;
    if (!apiKey) {
        return sock.sendMessage(chatId, {
            text: '❌ The .smeme command is not configured. Set the VOICY_API_KEY environment variable first.'
        }, { quoted: getFakeVcard() });
    }

    const query = String(text || '').trim() || 'meme';

    try {
        await sock.sendMessage(chatId, {
            react: { text: '🔎', key: message.key }
        });

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
        if (!searchResponse.ok) {
            throw new Error(`Voicy search failed with HTTP ${searchResponse.status}`);
        }

        const clips = getClipList(await searchResponse.json()).filter((clip) => {
            const sound = getClipField(clip, 'Sound', 'sound', 'Audio', 'audio', 'Url', 'url');
            return typeof sound === 'string' && /^https?:\/\//i.test(sound);
        });

        if (!clips.length) {
            return sock.sendMessage(chatId, {
                text: `❌ No Voicy sound was found for: ${query}`
            }, { quoted: getFakeVcard() });
        }

        const clip = clips[Math.floor(Math.random() * clips.length)];
        const soundUrl = getClipField(clip, 'Sound', 'sound', 'Audio', 'audio', 'Url', 'url');
        const title = getClipField(clip, 'Name', 'name', 'Title', 'title') || 'Meme sound';

        const audioResponse = await fetch(soundUrl, {
            signal: AbortSignal.timeout(20000)
        });
        if (!audioResponse.ok) {
            throw new Error(`Voicy audio download failed with HTTP ${audioResponse.status}`);
        }

        const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
        if (audioBuffer.length > 15 * 1024 * 1024) {
            throw new Error('Voicy audio exceeds the 15 MB limit');
        }

        await sock.sendMessage(chatId, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
            fileName: `${cleanFileName(title)}.mp3`,
            ptt: false
        }, { quoted: message });

        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });
    } catch (error) {
        console.error('.smeme error:', error.response?.status || error.message);
        await sock.sendMessage(chatId, {
            text: '❌ I could not fetch a meme sound right now. Please try again later.'
        }, { quoted: getFakeVcard() });
        await sock.sendMessage(chatId, {
            react: { text: '❌', key: message.key }
        });
    }
};

module.exports.help = '`.smeme [search words]` — search Voicy and send a meme sound';
module.exports.tags = ['media'];
module.exports.command = ['smeme'];
module.exports.alias = ['smeme'];
