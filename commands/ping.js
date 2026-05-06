const os = require("os");
const { performance } = require("perf_hooks");
const settings = require("../settings.js");
const { isButtonModeOn, sendButtonMessage } = require("../lib/buttonHelper");
const getFakeVcard = require('../lib/fakeVcard');

function formatBytes(bytes) {
    if (bytes === 0) return "0B";
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

async function pingCommand(sock, chatId, message) {
    try {
        const start   = performance.now();
        await sock.sendMessage(chatId, { text: "🏓 Pong!" }, { quoted: getFakeVcard() });
        const latency = ((performance.now() - start) / 1000).toFixed(4);

        const cpus = os.cpus();
        const cpu  = cpus.reduce(
            (acc, c) => {
                const total = Object.values(c.times).reduce((a, b) => a + b, 0);
                acc.total += total;
                acc.speed += c.speed;
                Object.keys(c.times).forEach(key => acc.times[key] += c.times[key]);
                return acc;
            },
            { speed: 0, total: 0, times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 } }
        );

        const ramUsage = `${formatBytes(os.totalmem() - os.freemem())} / ${formatBytes(os.totalmem())}`;
        const response =
            `*Pong!* 🏓\n` +
            `*Response Speed:* *${latency}* seconds\n\n` +
            `*💻 ${settings.botName || 'ii324BOT'}* Server Info\n` +
            `RAM Usage: *${ramUsage}*\n` +
            `CPU Cores: *${cpus.length}*\n` +
            `CPU Speed: *${(cpu.speed / cpus.length).toFixed(2)} MHz*`;

        if (isButtonModeOn()) {
            await sendButtonMessage(sock, chatId, {
                text: response,
                footer: `${settings.botName || 'ii324BOT'} 👑`,
                buttons: [
                    { id: '.alive', text: '🤖 Alive Status' },
                ],
            }, message);
        } else {
            const channelInfo = {
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: "201060715493@newsletter",
                        newsletterName: settings.botName || 'ii324BOT',
                        serverMessageId: -1
                    }
                }
            };
            await sock.sendMessage(chatId, { text: response, ...channelInfo }, { quoted: getFakeVcard() });
        }

    } catch (error) {
        console.error("Error in ping command:", error);
        await sock.sendMessage(chatId, { text: "❌ Failed to get ping info." }, { quoted: getFakeVcard() });
    }
}

module.exports = pingCommand;
