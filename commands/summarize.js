const axios = require('axios');
const getFakeVcard = require('../lib/fakeVcard');

const MAX_INPUT_CHARS = 6000; // keep the upstream prompt reasonable

function getTargetText(message, args = []) {
    const ctx = message.message?.extendedTextMessage?.contextInfo;
    const quoted = ctx?.quotedMessage;
    const quotedText = quoted?.conversation
        || quoted?.extendedTextMessage?.text
        || quoted?.imageMessage?.caption
        || quoted?.videoMessage?.caption
        || '';

    if (quotedText.trim()) return quotedText.trim();
    if (args.length) return args.join(' ').trim();
    return '';
}

async function summarizeCommand(sock, chatId, message, args = []) {
    const text = getTargetText(message, args);

    if (!text) {
        await sock.sendMessage(chatId, {
            text: '❌ Reply to a long message (or paste text after `.summarize`) to get a summary.\n\n' +
                'Example: `.summarize <long article text>`',
        }, { quoted: getFakeVcard() });
        return;
    }

    const trimmedText = text.length > MAX_INPUT_CHARS
        ? `${text.slice(0, MAX_INPUT_CHARS)}...`
        : text;

    try {
        await sock.sendMessage(chatId, { react: { text: '📝', key: message.key } });

        const prompt = 'Summarize the following text in 3-5 concise bullet points, ' +
            'staying strictly faithful to what it says without adding outside information:\n\n' +
            trimmedText;

        const apiUrl = `https://all-in-1-ais.officialhectormanuel.workers.dev/?query=${encodeURIComponent(prompt)}&model=gpt-4.5`;
        const response = await axios.get(apiUrl);

        if (response.data && response.data.success && response.data.message?.content) {
            const summary = response.data.message.content;
            await sock.sendMessage(chatId, {
                text: `📝 *Summary*\n\n${summary}`,
            }, { quoted: getFakeVcard() });
            await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
        } else {
            throw new Error('Invalid summarizer response');
        }
    } catch (error) {
        console.error('summarize error:', error);
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
        await sock.sendMessage(chatId, {
            text: '❌ Failed to summarize that text. Try again later.',
        }, { quoted: getFakeVcard() });
    }
}

module.exports = summarizeCommand;
