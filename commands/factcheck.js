const axios = require('axios');
const getFakeVcard = require('../lib/fakeVcard');

const API_URL = 'https://factchecktools.googleapis.com/v1alpha1/claims:search';
const MAX_QUERY_LENGTH = 500;

function shorten(value, limit) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!text) return 'Not available';
    return text.length > limit ? `${text.slice(0, limit - 1).trim()}…` : text;
}

function getQuotedText(message) {
    const quoted = message?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return '';
    return quoted.conversation
        || quoted.extendedTextMessage?.text
        || quoted.imageMessage?.caption
        || quoted.videoMessage?.caption
        || quoted.documentMessage?.caption
        || '';
}

function formatReview(claim, index) {
    const review = claim.claimReview?.[0] || {};
    const publisher = review.publisher?.name || review.publisher?.site || 'Unknown publisher';
    const rating = review.textualRating || 'No textual rating provided';
    const date = review.reviewDate ? new Date(review.reviewDate).toLocaleDateString('en-US') : 'Unknown date';
    const title = shorten(review.title, 180);
    const claimText = shorten(claim.text, 260);
    const source = review.url || 'No source URL provided';

    return `*${index}. Published fact-check result*\n`
        + `*Claim:* ${claimText}\n`
        + `*Rating:* ${rating}\n`
        + `*Publisher:* ${publisher}\n`
        + `*Reviewed:* ${date}\n`
        + `*Article:* ${title}\n`
        + `*Source:* ${source}`;
}

module.exports = async function factCheckCommand(sock, chatId, message, text) {
    const directQuery = String(text || '').trim();
    const query = (directQuery || String(getQuotedText(message) || '').trim()).slice(0, MAX_QUERY_LENGTH);

    if (!query) {
        return sock.sendMessage(chatId, {
            text: 'Please provide a claim to search, or reply to a message with `.factcheck`.\n\nExample: `.factcheck The claim you want to check`'
        }, { quoted: getFakeVcard() });
    }

    const apiKey = String(process.env.GOOGLE_FACTCHECK_API_KEY || process.env.FACTCHECK_API_KEY || '').trim();
    if (!apiKey) {
        return sock.sendMessage(chatId, {
            text: '❌ .factcheck needs a Google Fact Check Tools API key. The bot owner must set `GOOGLE_FACTCHECK_API_KEY` in Railway and redeploy the bot.'
        }, { quoted: message || getFakeVcard() });
    }

    try {
        const response = await axios.get(API_URL, {
            params: {
                query,
                languageCode: 'en',
                pageSize: 3,
                key: apiKey
            },
            timeout: 20000,
            validateStatus: () => true
        });

        if (response.status === 401 || response.status === 403) {
            return sock.sendMessage(chatId, {
                text: '❌ Google rejected the fact-check API key. The bot owner should enable **Fact Check Tools API**, verify `GOOGLE_FACTCHECK_API_KEY` in Railway, and redeploy.'
            }, { quoted: message || getFakeVcard() });
        }

        if (response.status === 429) {
            return sock.sendMessage(chatId, {
                text: 'The fact-check search is temporarily rate-limited. Please try again later.'
            }, { quoted: message || getFakeVcard() });
        }

        if (response.status >= 400) {
            console.error('factcheck provider error:', response.status, response.data);
            return sock.sendMessage(chatId, {
                text: 'The fact-check search service is unavailable right now. Please try again later.'
            }, { quoted: message || getFakeVcard() });
        }

        const claims = response.data?.claims || [];
        const reviewedClaims = claims.filter((claim) => Array.isArray(claim.claimReview) && claim.claimReview.length);
        if (!reviewedClaims.length) {
            return sock.sendMessage(chatId, {
                text: `No matching published fact-check review was found for:\n\n*${shorten(query, 500)}*\n\nThis does not establish whether the claim is true or false. Check reliable primary sources and reputable fact-checking organizations.`
            }, { quoted: message || getFakeVcard() });
        }

        const results = reviewedClaims.slice(0, 3).map(formatReview).join('\n\n');
        const footer = '\n\n> These are matching published ClaimReview results. They are not an independent verdict by the bot.';
        await sock.sendMessage(chatId, {
            text: `*Fact-check search results*\n\n${results}${footer}`
        }, { quoted: message || getFakeVcard() });
    } catch (error) {
        console.error('factcheck error:', error.message);
        await sock.sendMessage(chatId, {
            text: 'The fact-check search service is unavailable right now. Please try again later.'
        }, { quoted: message || getFakeVcard() });
    }
};

module.exports.help = '`.factcheck <claim>` — search published fact-check reviews';
module.exports.tags = ['general'];
module.exports.command = ['factcheck'];
module.exports.alias = ['factcheck', 'checkclaim'];
