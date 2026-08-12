const QRCode = require('qrcode');
const getFakeVcard = require('../lib/fakeVcard');

const MAX_QR_TEXT_LENGTH = 1500;

module.exports = async function qrCommand(sock, chatId, message, text) {
    const value = String(text || '').trim();

    if (!value) {
        return sock.sendMessage(chatId, {
            text: 'Please provide text or a URL to turn into a QR code.\n\nExample: `.qr https://example.com`'
        }, { quoted: getFakeVcard() });
    }

    if (value.length > MAX_QR_TEXT_LENGTH) {
        return sock.sendMessage(chatId, {
            text: `The QR content is too long. Please use ${MAX_QR_TEXT_LENGTH} characters or fewer.`
        }, { quoted: getFakeVcard() });
    }

    try {
        const image = await QRCode.toBuffer(value, {
            errorCorrectionLevel: 'M',
            type: 'png',
            width: 768,
            margin: 2,
            color: {
                dark: '#111111',
                light: '#FFFFFFFF'
            }
        });

        await sock.sendMessage(chatId, {
            image,
            mimetype: 'image/png',
            caption: `QR code created for:\n${value}`
        }, { quoted: message });
    } catch (error) {
        console.error('qr error:', error.message);
        await sock.sendMessage(chatId, {
            text: 'I could not create that QR code. Please try different text or a valid URL.'
        }, { quoted: getFakeVcard() });
    }
};

module.exports.help = '`.qr <text or URL>` — create a QR code';
module.exports.tags = ['tools'];
module.exports.command = ['qr'];
module.exports.alias = ['qr'];
