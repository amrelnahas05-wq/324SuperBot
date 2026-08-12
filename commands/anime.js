const axios = require('axios');
const getFakeVcard = require('../lib/fakeVcard');

function cleanText(value, maxLength) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!text) return 'Not available';
    return text.length > maxLength ? `${text.slice(0, maxLength - 1).trim()}…` : text;
}

function formatAnime(anime) {
    const title = anime.title_english || anime.title || 'Unknown title';
    const alternateTitle = anime.title_japanese ? `\n*Japanese:* ${anime.title_japanese}` : '';
    const genres = (anime.genres || []).map((genre) => genre.name).slice(0, 5).join(', ') || 'Not available';
    const studios = (anime.studios || []).map((studio) => studio.name).slice(0, 3).join(', ') || 'Not available';
    const score = anime.score ? `${anime.score}/10` : 'Not scored';

    return `*${title}*${alternateTitle}\n\n`
        + `*Type:* ${anime.type || 'Not available'}\n`
        + `*Episodes:* ${anime.episodes ?? 'Unknown'}\n`
        + `*Status:* ${anime.status || 'Not available'}\n`
        + `*Score:* ${score}\n`
        + `*Rating:* ${anime.rating || 'Not available'}\n`
        + `*Aired:* ${anime.aired?.string || 'Not available'}\n`
        + `*Genres:* ${genres}\n`
        + `*Studios:* ${studios}\n\n`
        + `*Synopsis:* ${cleanText(anime.synopsis, 700)}\n\n`
        + `*More information:* ${anime.url || 'Not available'}`;
}

module.exports = async function animeCommand(sock, chatId, message, text) {
    const query = String(text || '').trim();

    if (!query) {
        return sock.sendMessage(chatId, {
            text: 'Please provide an anime title.\n\nExample: `.anime Fullmetal Alchemist Brotherhood`'
        }, { quoted: getFakeVcard() });
    }

    try {
        const response = await axios.get('https://api.jikan.moe/v4/anime', {
            params: {
                q: query,
                limit: 1,
                sfw: 'true'
            },
            timeout: 18000,
            validateStatus: () => true
        });

        if (response.status === 429) {
            return sock.sendMessage(chatId, {
                text: 'The anime database is busy right now. Please wait a moment and try again.'
            }, { quoted: getFakeVcard() });
        }

        const anime = response.data?.data?.[0];
        if (response.status >= 400 || !anime) {
            return sock.sendMessage(chatId, {
                text: `No safe-for-work anime result was found for *${query}*. Try a more specific title.`
            }, { quoted: getFakeVcard() });
        }

        const caption = formatAnime(anime);
        const poster = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url;

        if (poster) {
            try {
                await sock.sendMessage(chatId, {
                    image: { url: poster },
                    caption
                }, { quoted: message });
                return;
            } catch (error) {
                console.warn('anime poster send failed:', error.message);
            }
        }

        await sock.sendMessage(chatId, { text: caption }, { quoted: message });
    } catch (error) {
        console.error('anime error:', error.message);
        await sock.sendMessage(chatId, {
            text: 'The anime search service is unavailable right now. Please try again later.'
        }, { quoted: getFakeVcard() });
    }
};

module.exports.help = '`.anime <title>` — find anime information and a poster';
module.exports.tags = ['general'];
module.exports.command = ['anime'];
module.exports.alias = ['anime', 'animesearch'];
