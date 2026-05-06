const settings = require('../settings');

function getFakeVcard() {
    const rawNumber = settings.ownerNumber.replace(/[^0-9]/g, '');
    const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${settings.botName}\nTEL;waid=${rawNumber}:+${rawNumber}\nEND:VCARD`;

    return {
        key: {
            remoteJid: 'status@broadcast',
            fromMe: false,
            id: 'FAKEVCARD001',
        },
        message: {
            contactMessage: {
                displayName: settings.botName,
                vcard,
            },
        },
    };
}

module.exports = getFakeVcard;
