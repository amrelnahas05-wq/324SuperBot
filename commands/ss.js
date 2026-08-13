const { assertSafePublicHttpUrl } = require('../lib/urlSafety');

async function handleSsCommand(sock, chatId, message, match) {
    if (!match) {
        await sock.sendMessage(chatId, {
            text: `*SCREENSHOT TOOL*\n\n*.ss <url>*\n*.ssweb <url>*\n*.screenshot <url>*\n\nTake a screenshot of a public website.\n\nExample:\n.ss https://example.com`,
        }, { quoted: message });
        return;
    }

    try {
        await sock.presenceSubscribe(chatId);
        await sock.sendPresenceUpdate('composing', chatId);

        const targetUrl = await assertSafePublicHttpUrl(match);
        const apiUrl = new URL('https://api.siputzx.my.id/api/tools/ssweb');
        apiUrl.searchParams.set('url', targetUrl.toString());
        apiUrl.searchParams.set('theme', 'light');
        apiUrl.searchParams.set('device', 'desktop');

        const response = await fetch(apiUrl, {
            headers: { accept: 'image/*, */*;q=0.8' },
            signal: AbortSignal.timeout(30000),
        });
        if (!response.ok) throw new Error(`Screenshot provider returned HTTP ${response.status}`);

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.startsWith('image/')) throw new Error('Screenshot provider did not return an image');

        const imageBuffer = Buffer.from(await response.arrayBuffer());
        if (!imageBuffer.length || imageBuffer.length > 12 * 1024 * 1024) {
            throw new Error('Screenshot image is empty or too large');
        }

        await sock.sendMessage(chatId, { image: imageBuffer }, { quoted: message });
    } catch (error) {
        console.error('[SS] Screenshot command failed:', error.message);
        const detail = /valid URL|Only http|Local and internal|Private|credentials|could not be resolved/.test(error.message)
            ? error.message
            : 'Failed to take a screenshot. The website may block screenshots or the provider may be unavailable.';
        await sock.sendMessage(chatId, { text: `❌ ${detail}` }, { quoted: message });
    }
}

module.exports = { handleSsCommand };
