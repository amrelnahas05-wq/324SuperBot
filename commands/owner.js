const settings = require('../settings');

async function ownerCommand(sock, chatId) {
    const rawNumber = settings.ownerNumber.replace(/[^0-9]/g, '');

    const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${settings.botOwner}\nTEL;waid=${rawNumber}:+${rawNumber}\nEND:VCARD`;

    await sock.sendMessage(chatId, {
        contacts: { displayName: settings.botOwner, contacts: [{ vcard }] },
    });
}

module.exports = ownerCommand;
