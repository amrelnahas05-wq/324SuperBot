async function catholicCommand(sock, chatId, message) {
    await sock.sendMessage(chatId, { text: '❌ This command is disabled.' }, { quoted: message });
}

module.exports = catholicCommand;
