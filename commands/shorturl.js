const axios = require('axios');
const getFakeVcard = require('../lib/fakeVcard');

function normaliseUrl(value) {
    const candidate = String(value || '').trim();
    if (!candidate) return null;

    const withProtocol = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
    try {
        const parsed = new URL(withProtocol);
        if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) return null;
        return parsed.toString();
    } catch (_) {
        return null;
    }
}

module.exports = async function shortUrlCommand(sock, chatId, message, text) {
    const longUrl = normaliseUrl(text);

    if (!longUrl) {
        return sock.sendMessage(chatId, {
            text: 'Please provide a valid URL.\n\nExample: `.shorturl https://example.com/very/long/link`'
        }, { quoted: getFakeVcard() });
    }

    try {
        const response = await axios.get('https://is.gd/create.php', {
            params: {
                format: 'json',
                url: longUrl
            },
            timeout: 15000,
            validateStatus: () => true
        });

        const data = response.data || {};
        if (response.status >= 400 || data.errorcode || !data.shorturl) {
            const reason = data.errormessage || 'The shortening provider could not create a link.';
            return sock.sendMessage(chatId, {
                text: `I could not shorten that URL. ${reason}`
            }, { quoted: getFakeVcard() });
        }

        await sock.sendMessage(chatId, {
            text: `*Short URL created*\n\n${data.shorturl}\n\n*Original:* ${longUrl}`
        }, { quoted: message });
    } catch (error) {
        console.error('shorturl error:', error.message);
        await sock.sendMessage(chatId, {
            text: 'The URL-shortening service is unavailable right now. Please try again later.'
        }, { quoted: getFakeVcard() });
    }
};

module.exports.help = '`.shorturl <URL>` — shorten a web link';
module.exports.tags = ['tools'];
module.exports.command = ['shorturl'];
module.exports.alias = ['shorturl', 'shorten'];
