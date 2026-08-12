const getFakeVcard = require('../lib/fakeVcard');

const GLYPHS = {
    A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
    B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
    C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
    D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
    E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
    F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
    G: ['01111', '10000', '10000', '10111', '10001', '10001', '01110'],
    H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
    I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
    J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
    K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
    L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
    M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
    N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
    O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
    P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
    Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
    R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
    S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
    T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
    U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
    V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
    W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
    X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
    Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
    Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
    '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
    '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
    '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
    '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
    '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
    '5': ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
    '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
    '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
    '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
    '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
    '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
    '?': ['01110', '10001', '00001', '00010', '00100', '00000', '00100'],
    '.': ['00000', '00000', '00000', '00000', '00000', '00110', '00110'],
    '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
    ' ': ['000', '000', '000', '000', '000', '000', '000']
};

function renderAscii(value) {
    const characters = [...value.toUpperCase()].map((character) => GLYPHS[character] || GLYPHS['?']);
    return Array.from({ length: 7 }, (_, row) => characters
        .map((character) => character[row].replace(/1/g, '█').replace(/0/g, ' '))
        .join('  ')
        .replace(/\s+$/, '')
    ).join('\n');
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

module.exports = async function asciiCommand(sock, chatId, message, text) {
    const directValue = String(text || '').trim();
    const value = directValue || String(getQuotedText(message) || '').trim();

    if (!value) {
        return sock.sendMessage(chatId, {
            text: 'Please provide text to convert to ASCII art, or reply to a text message with `.ascii`.\n\nExample: `.ascii 324BOT`'
        }, { quoted: getFakeVcard() });
    }

    if ([...value].length > 18) {
        return sock.sendMessage(chatId, {
            text: 'Please use 18 characters or fewer so the ASCII art stays readable in WhatsApp.'
        }, { quoted: message || getFakeVcard() });
    }

    const unsupported = [...value].filter((character) => !GLYPHS[character.toUpperCase()]);
    const art = renderAscii(value);
    const note = unsupported.length
        ? '\n\n_Note: unsupported characters are displayed as ?._'
        : '';

    await sock.sendMessage(chatId, {
        text: `\`\`\`\n${art}\n\`\`\`${note}`
    }, { quoted: message || getFakeVcard() });
};

module.exports.help = '`.ascii <text>` — create block text art';
module.exports.tags = ['text'];
module.exports.command = ['ascii', 'ASCII'];
module.exports.alias = ['ascii', 'ASCII'];
