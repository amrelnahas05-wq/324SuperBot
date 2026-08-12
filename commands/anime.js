const axios = require('axios');
const getFakeVcard = require('../lib/fakeVcard');

const ANILIST_API_URL = 'https://graphql.anilist.co';
const ANILIST_QUERY = `
query ($search: String) {
  Media(search: $search, type: ANIME, isAdult: false) {
    title { romaji english native }
    format
    episodes
    status
    averageScore
    description(asHtml: false)
    genres
    studios(isMain: true) { nodes { name } }
    seasonYear
    siteUrl
    coverImage { large medium }
  }
}`;

function cleanText(value, maxLength) {
    const text = String(value || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (!text) return 'Not available';
    return text.length > maxLength ? `${text.slice(0, maxLength - 1).trim()}…` : text;
}

function formatStatus(status) {
    return String(status || 'Not available')
        .toLowerCase()
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function formatAnime(anime) {
    const title = anime.title?.english || anime.title?.romaji || anime.title?.native || 'Unknown title';
    const japaneseTitle = anime.title?.native && anime.title.native !== title ? `\n*Japanese:* ${anime.title.native}` : '';
    const genres = (anime.genres || []).slice(0, 5).join(', ') || 'Not available';
    const studios = (anime.studios?.nodes || []).map((studio) => studio.name).slice(0, 3).join(', ') || 'Not available';
    const score = Number.isFinite(anime.averageScore) ? `${anime.averageScore}/100` : 'Not scored';

    return `*${title}*${japaneseTitle}\n\n`
        + `*Format:* ${anime.format || 'Not available'}\n`
        + `*Episodes:* ${anime.episodes ?? 'Unknown'}\n`
        + `*Status:* ${formatStatus(anime.status)}\n`
        + `*Score:* ${score}\n`
        + `*Year:* ${anime.seasonYear || 'Unknown'}\n`
        + `*Genres:* ${genres}\n`
        + `*Studios:* ${studios}\n\n`
        + `*Synopsis:* ${cleanText(anime.description, 700)}\n\n`
        + `*More information:* ${anime.siteUrl || 'Not available'}`;
}

async function sendAnimeResult(sock, chatId, message, anime) {
    const caption = formatAnime(anime);
    const poster = anime.coverImage?.large || anime.coverImage?.medium;

    if (poster) {
        try {
            const imageResponse = await axios.get(poster, {
                responseType: 'arraybuffer',
                timeout: 20000,
                validateStatus: () => true,
                headers: { Accept: 'image/*' }
            });
            const contentType = String(imageResponse.headers?.['content-type'] || '').split(';')[0];
            if (imageResponse.status >= 200 && imageResponse.status < 300 && contentType.startsWith('image/')) {
                await sock.sendMessage(chatId, {
                    image: Buffer.from(imageResponse.data),
                    mimetype: contentType,
                    caption
                }, { quoted: message || getFakeVcard() });
                return;
            }
        } catch (error) {
            console.warn('anime poster download failed:', error.message);
        }
    }

    await sock.sendMessage(chatId, { text: caption }, { quoted: message || getFakeVcard() });
}

module.exports = async function animeCommand(sock, chatId, message, text) {
    const query = String(text || '').trim().slice(0, 120);

    if (!query) {
        return sock.sendMessage(chatId, {
            text: 'Please provide an anime title.\n\nExample: `.anime Fullmetal Alchemist Brotherhood`'
        }, { quoted: getFakeVcard() });
    }

    try {
        const response = await axios.post(ANILIST_API_URL, {
            query: ANILIST_QUERY,
            variables: { search: query }
        }, {
            timeout: 20000,
            validateStatus: () => true,
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' }
        });

        if (response.status === 429) {
            return sock.sendMessage(chatId, {
                text: 'The anime search service is busy right now. Please wait a moment and try again.'
            }, { quoted: message || getFakeVcard() });
        }

        const anime = response.data?.data?.Media;
        if (response.status >= 400 || response.data?.errors?.length || !anime) {
            return sock.sendMessage(chatId, {
                text: `No safe-for-work anime result was found for *${query}*. Try a more specific title.`
            }, { quoted: message || getFakeVcard() });
        }

        await sendAnimeResult(sock, chatId, message, anime);
    } catch (error) {
        console.error('anime error:', error.message);
        await sock.sendMessage(chatId, {
            text: 'The anime search service is unavailable right now. Please try again later.'
        }, { quoted: message || getFakeVcard() });
    }
};

module.exports.help = '`.anime <title>` — find anime information and a poster';
module.exports.tags = ['general'];
module.exports.command = ['anime'];
module.exports.alias = ['anime', 'animesearch'];
