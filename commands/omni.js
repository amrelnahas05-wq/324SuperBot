const axios = require('axios');
const { sendButtonMessage } = require('../lib/buttonHelper');
const getFakeVcard = require('../lib/fakeVcard');

const DEFAULT_BASE_URL = 'http://127.0.0.1:20128/v1';
const DEFAULT_MODEL = 'auto';
const DEFAULT_TIMEOUT_MS = 45000;
const MAX_PROMPT_LENGTH = 4000;

function getPrompt(text) {
    return String(text || '').trim();
}

function getBaseUrl() {
    return String(process.env.OMNIROUTE_BASE_URL || DEFAULT_BASE_URL)
        .trim()
        .replace(/\/+$/, '');
}

module.exports = async function omniCommand(sock, chatId, text, message) {
    const prompt = getPrompt(text);

    if (!prompt) {
        return sock.sendMessage(chatId, {
            text: 'ℹ️ Usage: `.omni <your question>`\n\nExample: `.omni Explain how solar panels work`'
        }, { quoted: message || getFakeVcard() });
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
        return sock.sendMessage(chatId, {
            text: `❌ Your prompt is too long. Please keep it under ${MAX_PROMPT_LENGTH} characters.`
        }, { quoted: message || getFakeVcard() });
    }

    const baseUrl = getBaseUrl();
    const model = String(process.env.OMNIROUTE_MODEL || DEFAULT_MODEL).trim();
    const timeout = Number(process.env.OMNIROUTE_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
    const headers = { 'Content-Type': 'application/json' };

    if (process.env.OMNIROUTE_API_KEY) {
        headers.Authorization = `Bearer ${process.env.OMNIROUTE_API_KEY}`;
    }

    try {
        await sock.sendMessage(chatId, {
            react: { text: '🤔', key: message?.key }
        });

        const response = await axios.post(`${baseUrl}/chat/completions`, {
            model,
            messages: [
                {
                    role: 'system',
                    content: process.env.OMNIROUTE_SYSTEM_PROMPT ||
                        'Answer clearly and concisely in English. Do not claim to have performed actions you did not perform.'
                },
                { role: 'user', content: prompt }
            ]
        }, { headers, timeout: Number.isFinite(timeout) ? timeout : DEFAULT_TIMEOUT_MS });

        const answer = response.data?.choices?.[0]?.message?.content;
        if (!answer || typeof answer !== 'string') {
            throw new Error('OmniRoute returned no assistant message');
        }

        await sendButtonMessage(sock, chatId, {
            text: `🤖 *OmniRoute*\n\n${answer.trim()}`,
            footer: `Model: ${model}`,
            buttons: [{ id: '.omni', text: 'Ask Again' }]
        }, message);

        if (message?.key) {
            await sock.sendMessage(chatId, {
                react: { text: '✅', key: message.key }
            });
        }
    } catch (error) {
        const status = error.response?.status;
        const detail = error.response?.data?.error?.message || error.response?.data?.message;
        console.error('.omni error:', status || error.message);

        let text = '❌ OmniRoute is unavailable right now. Please try again later.';
        if (status === 401 || status === 403) {
            text = '❌ OmniRoute rejected the request. Check OMNIROUTE_API_KEY and its permissions.';
        } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            text = `❌ I cannot reach OmniRoute at ${baseUrl}. Start OmniRoute or check OMNIROUTE_BASE_URL.`;
        } else if (status === 404) {
            text = `❌ OmniRoute endpoint not found at ${baseUrl}/chat/completions. Check OMNIROUTE_BASE_URL.`;
        } else if (detail) {
            text = `❌ OmniRoute error: ${String(detail).slice(0, 500)}`;
        }

        await sock.sendMessage(chatId, {
            text
        }, { quoted: message || getFakeVcard() });

        if (message?.key) {
            await sock.sendMessage(chatId, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};

module.exports.help = '`.omni <question>` — ask OmniRoute an AI question';
module.exports.tags = ['ai'];
module.exports.command = ['omni'];
module.exports.alias = ['omni'];
