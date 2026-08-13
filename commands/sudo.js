const fs = require('fs');
const path = require('path');
const getFakeVcard = require('../lib/fakeVcard');
const {
    isSudoUser,
    addSudoUser,
    removeSudoUser,
    getAllSudoUsers,
    normalizeUserId,
} = require('../lib/sudoUsers');

function hasOwnerPrivileges(userId, message, botJid = null) {
    if (message?.key?.fromMe) return true;

    const cleanId = normalizeUserId(userId);
    if (!cleanId) return false;

    if (botJid) {
        const botNumber = normalizeUserId(String(botJid).split(':')[0]);
        if (botNumber === cleanId) return true;
    }

    try {
        const ownerFile = path.join(__dirname, '../data/owner.json');
        const ownerList = JSON.parse(fs.readFileSync(ownerFile, 'utf8'));
        if (Array.isArray(ownerList) && ownerList.some((owner) => normalizeUserId(owner) === cleanId)) {
            return true;
        }
    } catch (_) {
        // Owner configuration is optional; fall through to canonical sudo storage.
    }

    return isSudoUser(cleanId);
}

async function sudoCommand(sock, chatId, message, settings) {
    try {
        const sourceText = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const args = sourceText.trim().split(/\s+/).slice(1);
        const command = args[0]?.toLowerCase();
        const targetNumber = args[1];

        if (!message.key?.fromMe) {
            await sock.sendMessage(chatId, {
                text: '❌ This command is only for the bot owner!',
                mentions: [],
            }, { quoted: getFakeVcard() });
            return;
        }

        const prefix = settings?.prefix || '.';
        const buildList = () => {
            const users = getAllSudoUsers();
            let output = '👑 *Sudo Users List*\n\n';
            output += users.length
                ? users.map((user, index) => `${index + 1}. ${user}`).join('\n')
                : 'No sudo users added yet.';
            output += `\n\n*Usage:*\n• ${prefix}sudo add <number>\n• ${prefix}sudo remove <number>\n• ${prefix}sudo list`;
            return output;
        };

        if (!command || command === 'list') {
            await sock.sendMessage(chatId, { text: buildList() }, { quoted: getFakeVcard() });
            return;
        }

        if (!['add', 'remove'].includes(command)) {
            await sock.sendMessage(chatId, {
                text: `❌ Invalid sudo command!\n\n*Available commands:*\n• ${prefix}sudo add <number>\n• ${prefix}sudo remove <number>\n• ${prefix}sudo list`,
            }, { quoted: getFakeVcard() });
            return;
        }

        const cleanNumber = normalizeUserId(targetNumber);
        if (cleanNumber.length < 10 || cleanNumber.length > 15) {
            await sock.sendMessage(chatId, {
                text: `❌ Please provide a valid phone number.\n\nUsage: ${prefix}sudo ${command} 201060715493`,
            }, { quoted: getFakeVcard() });
            return;
        }

        const success = command === 'add' ? addSudoUser(cleanNumber) : removeSudoUser(cleanNumber);
        const action = command === 'add' ? 'added' : 'removed';
        await sock.sendMessage(chatId, {
            text: success
                ? `✅ *Sudo user ${action}!*\n\nNumber: ${cleanNumber}`
                : `❌ Failed to ${action === 'added' ? 'add' : 'remove'} the sudo user. Please try again.`,
        }, { quoted: getFakeVcard() });
    } catch (error) {
        console.error('[SUDO] Command failed:', error.message);
        await sock.sendMessage(chatId, { text: '❌ An error occurred while processing the sudo command.' }, { quoted: getFakeVcard() });
    }
}

module.exports = {
    sudoCommand,
    isSudoUser,
    hasOwnerPrivileges,
    addSudoUser,
    removeSudoUser,
    getAllSudoUsers,
};
