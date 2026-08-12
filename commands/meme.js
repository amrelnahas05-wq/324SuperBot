const IMGFLIP_MEMES_URL = 'https://api.imgflip.com/get_memes?type=image';

function pickRandom(items) {
    return items[Math.floor(Math.random() * items.length)];
}

async function memeCommand(sock, chatId, message) {
    try {
        const response = await fetch(IMGFLIP_MEMES_URL, {
            headers: { Accept: 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`Imgflip returned HTTP ${response.status}`);
        }

        const payload = await response.json();
        const memes = payload?.success && Array.isArray(payload.data?.memes)
            ? payload.data.memes.filter((meme) => meme?.url)
            : [];

        if (memes.length === 0) {
            throw new Error('Imgflip returned no meme images');
        }

        const meme = pickRandom(memes);
        const imageResponse = await fetch(meme.url);

        if (!imageResponse.ok) {
            throw new Error(`Imgflip image returned HTTP ${imageResponse.status}`);
        }

        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        const buttons = [
            { buttonId: '.meme', buttonText: { displayText: 'Another Meme' }, type: 1 },
            { buttonId: '.joke', buttonText: { displayText: 'Joke' }, type: 1 }
        ];

        await sock.sendMessage(chatId, {
            image: imageBuffer,
            caption: `Here is your meme: ${meme.name || 'Random Meme'}`,
            buttons,
            headerType: 1
        }, { quoted: message });
    } catch (error) {
        console.error('Error in meme command:', error.message);
        await sock.sendMessage(chatId, {
            text: 'Failed to fetch a meme right now. Please try again later.'
        }, { quoted: message });
    }
}

module.exports = memeCommand;
