const settings = require('../settings');
const { isButtonModeOn } = require('../lib/buttonHelper');
const getFakeVcard = require('../lib/fakeVcard');
let sendButtons;
try {
    sendButtons = require('kango-wa').sendButtons;
} catch (_) {
    sendButtons = null;
}

function formatTime(seconds) {
    const days = Math.floor(seconds / (24 * 60 * 60));
    seconds = seconds % (24 * 60 * 60);
    const hours = Math.floor(seconds / (60 * 60));
    seconds = seconds % (60 * 60);
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);

    let time = '';
    if (days > 0) time += `${days}d `;
    if (hours > 0) time += `${hours}h `;
    if (minutes > 0) time += `${minutes}m `;
    if (seconds > 0 || time === '') time += `${seconds}s`;

    return time.trim();
}

const CATEGORIES = {
    ai: {
        emoji: '🤖',
        title: 'AI',
        commands: ['.gpt', '.gemini', '.deepseek', '.aiart', '.suno', '.imagine', '.veo3', '.omni'],
    },
    download: {
        emoji: '📥',
        title: 'Download',
        commands: ['.play', '.song', '.video', '.instagram', '.facebook', '.tiktok', '.snapchat', '.twitter', '.pinterest'],
    },
    fun: {
        emoji: '🎯',
        title: 'Fun',
        commands: ['.compliment', '.insult', '.flirt', '.goodnight', '.character', '.crush', '.simp', '.stupid', '.ship', '.wasted', '.8ball'],
    },
    games: {
        emoji: '🎮',
        title: 'Games',
        commands: ['.quiz', '.endquiz', '.tictactoe', '.hangman', '.trivia', '.answer', '.truth', '.dare'],
    },
    group: {
        emoji: '👥',
        title: 'Group',
        commands: ['.ban', '.unban', '.promote', '.demote', '.kick', '.mute', '.unmute', '.open', '.close', '.warn', '.warnings', '.antilink', '.antibadword', '.tagall', '.tag', '.clear', '.delete', '.resetlink', '.groupinfo', '.admins', '.welcome', '.setwelcome', '.goodbye', '.setgoodbye', '.poll', '.vcf'],
    },
    general: {
        emoji: '🌐',
        title: 'General',
        commands: ['.menu', '.ping', '.alive', '.tts', '.owner', '.joke', '.quote', '.fact', '.factcheck', '.anime', '.weather', '.news', '.lyrics', '.vv', '.vv2', '.ss', '.jid'],
    },
    owner: {
        emoji: '🔒',
        title: 'Owner',
        commands: ['.mode', '.buttonmode', '.chatbot', '.autoreactstatus', '.autostatusreply', '.statusmsg', '.autoviewstatus', '.poststatus', '.autotype', '.autorecord', '.autorecordtype', '.autoreact', '.autoreply', '.autobio', '.autoread', '.anticall', '.antidelete', '.antiedit', '.setprefix', '.setpp', '.getpp', '.save', '.clearsession', '.cleartmp', '.update'],
    },
    photo: {
        emoji: '🎨',
        title: 'Photo',
        commands: ['.sticker', '.simage', '.blur', '.removebg', '.wanted', '.meme', '.smeme', '.take', '.emojimix', '.tgsticker', '.attp', '.wallpaper'],
    },
    religion: {
        emoji: '☪️',
        title: 'Religion',
        commands: ['.quran'],
    },
    tools: {
        emoji: '💻',
        title: 'Tools',
        commands: ['.newsletter', '.trim', '.tomp3', '.voicechanger woman|robot|chipmunk|deep|echo|radio', '.compress low|medium|high', '.summarize', '.qr', '.shorturl', '.qc', '.translate', '.transcribe', '.tgsearch', '.reportbug', '.ngl', '.script', '.repo'],
    },
    text: {
        emoji: '🔤',
        title: 'Text Art',
        commands: ['.ascii', '.metallic', '.ice', '.snow', '.impressive', '.matrix', '.light', '.neon', '.devil', '.purple', '.thunder', '.leaves', '.1917', '.arena', '.hacker', '.sand', '.blackpink', '.glitch', '.fire'],
    },
};

function getHeader() {
    const currentTime = new Date().toLocaleString('en-US', {
        timeZone: settings.timezone,
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
    const currentDate = new Date().toLocaleString('en-US', {
        timeZone: settings.timezone,
        day: '2-digit', month: '2-digit', year: 'numeric',
    });
    const uptimeFormatted = formatTime(process.uptime());
    const botMode = settings.commandMode === 'public' ? 'public' : 'private';

    return `*『 🤖 𝚒𝚒𝟹𝟸𝟺𝙱𝙾𝚃 』*
*│ 👤 ᴏᴡɴᴇʀ     : ${settings.botOwner}*
*│ 🌍 ᴍᴏᴅᴇ      : [ ${botMode} ]*
*│ ⏰ ᴛɪᴍᴇ      : ${currentTime}*
*│ 📅 ᴅᴀᴛᴇ      : ${currentDate}*
*│ 🛠️ ᴘʀᴇғɪx    : [ . ]*
*│ 🔄 ᴜᴘᴛɪᴍᴇ    : ${uptimeFormatted}*
*│ 🌐 ᴛɪᴍᴇᴢᴏɴᴇ : ${settings.timezone}*
*│ 🚀 ᴠᴇʀsɪᴏɴ   : ${settings.version}*
*╰─────────⟢*`;
}

function buildCategoryText(key) {
    const cat = CATEGORIES[key];
    if (!cat) return null;

    let text = `*『 ${cat.emoji} ${cat.title} Menu 』*\n`;
    for (const cmd of cat.commands) {
        text += `*│ ⬡ ${cmd}*\n`;
    }
    text += `*╰─────────⟢*`;
    return text;
}

function buildFullMenu() {
    let text = getHeader() + '\n';
    for (const key of Object.keys(CATEGORIES)) {
        text += '\n' + buildCategoryText(key) + '\n';
    }
    text += '\n> *© ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝚒𝚒𝟹𝟸𝟺𝙱𝙾𝚃*';
    return text;
}

const channelCtx = {
    forwardingScore: 1,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
        newsletterJid: '120363404284793169@newsletter',
        newsletterName: '🤖 𝚒𝚒𝟹𝟸𝟺𝙱𝙾𝚃',
        serverMessageId: -1,
    },
};

async function helpCommand(sock, chatId, message, _, subCategory) {
    if (subCategory && CATEGORIES[subCategory]) {
        const catText = buildCategoryText(subCategory) + '\n\n> *© ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝚒𝚒𝟹𝟸𝟺𝙱𝙾𝚃*';

        if (isButtonModeOn() && sendButtons) {
            try {
                const opts = {
                    text: catText,
                    footer: '© ii324BOT',
                    buttons: [
                        { id: '.help', text: '🔙 Back to Menu' },
                    ],
                    quoted: getFakeVcard(),
                    contextInfo: channelCtx,
                };
                await sendButtons(sock, chatId, opts);
            } catch (_) {
                await sock.sendMessage(chatId, { text: catText, contextInfo: channelCtx }, { quoted: getFakeVcard() });
            }
        } else {
            await sock.sendMessage(chatId, { text: catText, contextInfo: channelCtx }, { quoted: getFakeVcard() });
        }
        return;
    }

    if (isButtonModeOn() && sendButtons) {
        try {
            const menuText = getHeader() + '\n\n_Tap a category below to view its commands_';

            const buttons = Object.entries(CATEGORIES).map(([key, cat]) => ({
                id: `.help ${key}`,
                text: `${cat.emoji} ${cat.title}`,
            }));

            const opts = {
                text: menuText,
                footer: '© ii324BOT',
                buttons,
                quoted: getFakeVcard(),
                contextInfo: channelCtx,
            };
            await sendButtons(sock, chatId, opts);
            return;
        } catch (err) {
            console.error('[HELP] Button menu failed, falling back to full menu:', err.message);
        }
    }

    const fullMenu = buildFullMenu();

    try {
        await sock.sendMessage(chatId, { text: fullMenu, contextInfo: channelCtx }, { quoted: getFakeVcard() });
    } catch (error) {
        console.error('Error in help command:', error);
        await sock.sendMessage(chatId, { text: fullMenu }, { quoted: getFakeVcard() });
    }
}

module.exports = helpCommand;
