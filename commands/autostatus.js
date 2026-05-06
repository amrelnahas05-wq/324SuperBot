const fs = require('fs');
const path = require('path');

const channelInfo = {
    contextInfo: {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '201060715493@newsletter',
            newsletterName: 'ii324BOT',
            serverMessageId: -1
        }
    }
};

// Path to store auto status configuration
const configPath = path.join(__dirname, '../data/autoStatus.json');

// Initialize config file if it doesn't exist
if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify({ enabled: false }, null, 2));
}

// Load config safely
function loadConfig() {
    try {
        return JSON.parse(fs.readFileSync(configPath));
    } catch {
        return { enabled: false };
    }
}

// Save config safely
function saveConfig(config) {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Retry with exponential backoff
async function safeReadMessages(sock, keys, retries = 3, delay = 2000) {
    for (let i = 0; i < retries; i++) {
        try {
            await sock.readMessages(keys);
            return true;
        } catch (err) {
            if (err.message?.includes('rate-overlimit') && i < retries - 1) {
                console.log(`⚠️ Rate limit hit, retrying in ${delay}ms...`);
                await new Promise(r => setTimeout(r, delay));
                delay *= 2;
            } else {
                throw err;
            }
        }
    }
}

// Command
async function autoStatusCommand(sock, chatId, msg, args) {
    try {
        if (!msg.key.fromMe) {
            await sock.sendMessage(chatId, { 
                text: '❌ This command can only be used by the owner!',
                ...channelInfo
            });
            return;
        }

        let config = loadConfig();

        // Show usage if no arguments
        if (!args || args.length === 0) {
            const status = config.enabled ? '✅ enabled' : '❌ disabled';
            const text = `🔄 *Auto Status View*\n\nCurrent status: ${status}`;
            const { isButtonModeOn, sendButtonMessage } = require('../lib/buttonHelper');
            if (isButtonModeOn()) {
                await sendButtonMessage(sock, chatId, {
                    text,
                    footer: 'ii324BOT',
                    buttons: [
                        { id: '.autoviewstatus on',  text: '✅ Enable'  },
                        { id: '.autoviewstatus off', text: '❌ Disable' },
                    ],
                }, msg);
            } else {
                await sock.sendMessage(chatId, {
                    text: text + `\n\n📌 *Usage:*\n.autoviewstatus on - Enable\n.autoviewstatus off - Disable`,
                    ...channelInfo
                });
            }
            return;
        }

        // Handle commands
        const command = args[0].toLowerCase();
        if (command === 'on') {
            config.enabled = true;
            saveConfig(config);
            await sock.sendMessage(chatId, { 
                text: '✅ Auto status view has been *enabled*.\nBot will now automatically view all contact statuses.',
                ...channelInfo
            });
        } else if (command === 'off') {
            config.enabled = false;
            saveConfig(config);
            await sock.sendMessage(chatId, { 
                text: '❌ Auto status view has been *disabled*.\nBot will no longer automatically view statuses.',
                ...channelInfo
            });
        } else {
            await sock.sendMessage(chatId, { 
                text: '❌ Invalid command!\n\n📌 *Usage:*\n.autoviewstatus on - Enable auto status view\n.autoviewstatus off - Disable auto status view',
                ...channelInfo
            });
        }

    } catch (error) {
        console.error('Error in autostatus command:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Error occurred while managing auto status!\n' + error.message,
            ...channelInfo
        });
    }
}

// Check config
function isAutoStatusEnabled() {
    return loadConfig().enabled;
}

// View status helper
async function viewStatus(sock, key) {
    if (key?.remoteJid === 'status@broadcast') {
        await safeReadMessages(sock, [key]);
        const sender = key.participant || key.remoteJid;
        console.log(`✅ Viewed status from: ${sender.split('@')[0]}`);
    }
}

// Handle updates
async function handleStatusUpdate(sock, status) {
    try {
        if (!isAutoStatusEnabled()) return;

        // Add delay to avoid rate-limit
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (status.messages?.length > 0) {
            await viewStatus(sock, status.messages[0].key);
        } else if (status.key) {
            await viewStatus(sock, status.key);
        } else if (status.reaction?.key) {
            await viewStatus(sock, status.reaction.key);
        }

    } catch (error) {
        console.error('❌ Error in auto status view:', error.message);
    }
}

module.exports = {
    autoStatusCommand,
    handleStatusUpdate
};