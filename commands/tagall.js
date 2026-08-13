const isAdmin = require('../lib/isAdmin');
const { isSudo } = require('../lib/index');

async function tagAllCommand(sock, chatId, senderId) {
    try {
        if (!chatId.endsWith('@g.us')) {
            await sock.sendMessage(chatId, { text: '❌ This command can only be used in a group.' });
            return;
        }

        const [{ isSenderAdmin }, senderIsSudo] = await Promise.all([
            isAdmin(sock, chatId, senderId),
            isSudo(senderId),
        ]);

        if (!isSenderAdmin && !senderIsSudo) {
            await sock.sendMessage(chatId, { text: '❌ Only group admins or sudo users can use .tagall.' });
            return;
        }

        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = Array.isArray(groupMetadata?.participants) ? groupMetadata.participants : [];
        if (!participants.length) {
            await sock.sendMessage(chatId, { text: '❌ I could not find group participants.' });
            return;
        }

        const mentions = participants.map((participant) => participant.id).filter(Boolean);
        const text = `🔊 *Group Members:*\n\n${mentions.map((jid) => `@${jid.split('@')[0]}`).join('\n')}`;
        await sock.sendMessage(chatId, { text, mentions });
    } catch (error) {
        console.error('[TAGALL] Command failed:', error.message);
        await sock.sendMessage(chatId, { text: '❌ Failed to tag group members. Please try again.' });
    }
}

module.exports = tagAllCommand;
