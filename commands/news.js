const axios = require('axios');
const { sendButtonMessage } = require('../lib/buttonHelper');
const getFakeVcard = require('../lib/fakeVcard');

module.exports = async function (sock, chatId, message) {
    try {
        const apiKey = String(process.env.NEWS_API_KEY || '').trim();
        if (!apiKey) {
            await sock.sendMessage(chatId, { text: '❌ The news feature is not configured. Set NEWS_API_KEY to enable it.' });
            return;
        }

        const response = await axios.get('https://newsapi.org/v2/top-headlines', {
            params: { country: 'us', apiKey },
            timeout: 10000,
        });
        const articles = response.data.articles.slice(0, 5);

        let text = '📰 *Latest News*:\n\n';
        articles.forEach((article, index) => {
            text += `${index + 1}. *${article.title}*\n${article.description || ''}\n\n`;
        });
        text += '🌐 More: https://www.bbc.com/news';

        await sendButtonMessage(sock, chatId, {
            text,
            footer: 'Queen Riam 👑',
            buttons: [
                { id: '.news', text: '🔄 Refresh News' },
            ],
        }, message);

    } catch (error) {
        console.error('Error fetching news:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Sorry, I could not fetch news right now.'
        }, { quoted: getFakeVcard() });
    }
};
