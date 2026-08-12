const QRCode = require('qrcode');
const getFakeVcard = require('../lib/fakeVcard');

const MAX_QR_TEXT_LENGTH = 1500;

function getQuotedText(message) {
    const contextInfo = message?.message?.extendedTextMessage?.contextInfo;
    const quoted = contextInfo?.quotedMessage;
    if (!quoted) return '';

    return quoted.conversation
        || quoted.extendedTextMessage?.text
        || quoted.imageMessage?.caption
        || quoted.videoMessage?.caption
        || quoted.documentMessage?.caption
        || '';
}

module.exports = async function qrCommand(sock, chatId, message, text) {
    const directValue = String(text || '').trim();
    const value = directValue || String(getQuotedText(message) || '').trim();

    if (!value) {
        return sock.sendMessage(chatId, {
            text: 'Please provide text or a URL to turn into a QR code. You can also reply to a text message with `.qr`.\n\nExample: `.qr https://example.com`'
        }, { quoted: getFakeVcard() });
    }

    if (value.length > MAX_QR_TEXT_LENGTH) {
        return sock.sendMessage(chatId, {
            text: `The QR content is too long. Please use ${MAX_QR_TEXT_LENGTH} characters or fewer.`
        }, { quoted: message || getFakeVcard() });
    }

    try {
        const image = await QRCode.toBuffer(value, {
            errorCorrectionLevel: 'M',
            type: 'png',
            width: 640,
            margin: 2,
            color: {
                dark: '#111111',
                light: '#FFFFFFFF'
            }
        });

        await sock.sendMessage(chatId, {
            image,
            caption: `QR code created for:\n${value}`
        }, { quoted: message || getFakeVcard() });
    } catch (error) {
        console.error('qr error:', error.message);
        await sock.sendMessage(chatId, {
            text: 'I could not create that QR code. Please try different text or a valid URL.'
        }, { quoted: message || getFakeVcard() });
    }
};

module.exports.help = '`.qr <text or URL>` — create a QR code';
module.exports.tags = ['tools'];
module.exports.command = ['qr'];
module.exports.alias = ['qr'];
