const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeUserId, isSudoUser } = require('../lib/sudoUsers');
const isAdmin = require('../lib/isAdmin');
const { assertSafePublicHttpUrl } = require('../lib/urlSafety');
const tagAllCommand = require('../commands/tagall');
const { handleSsCommand } = require('../commands/ss');

test('sudo user IDs normalize consistently across phone and WhatsApp JID formats', () => {
    process.env.BOT_OWNER_NUMBER = '201060715493';
    assert.equal(normalizeUserId('+201060715493'), '201060715493');
    assert.equal(normalizeUserId('201060715493@s.whatsapp.net'), '201060715493');
    assert.equal(isSudoUser('201060715493@s.whatsapp.net'), true);
});

test('group-admin helper fails closed when bot metadata is absent', async () => {
    const sock = {
        user: { id: '100@s.whatsapp.net' },
        groupMetadata: async () => ({ participants: [{ id: '200@s.whatsapp.net', admin: 'admin' }] }),
    };
    const result = await isAdmin(sock, 'group@g.us', '200@s.whatsapp.net');
    assert.equal(result.isSenderAdmin, true);
    assert.equal(result.isBotAdmin, false);
});

test('URL safety rejects local and credential-bearing URLs', async () => {
    await assert.rejects(() => assertSafePublicHttpUrl('http://127.0.0.1:3000'), /Private network/);
    await assert.rejects(() => assertSafePublicHttpUrl('https://user:pass@example.com'), /embedded credentials/);
    await assert.rejects(() => assertSafePublicHttpUrl('file:///etc/passwd'), /Only http/);
});

test('tagall blocks ordinary group members', async () => {
    const sent = [];
    const sock = {
        user: { id: '100@s.whatsapp.net' },
        groupMetadata: async () => ({ participants: [
            { id: '100@s.whatsapp.net', admin: 'admin' },
            { id: '200@s.whatsapp.net' },
        ] }),
        sendMessage: async (...args) => { sent.push(args); },
    };
    await tagAllCommand(sock, 'group@g.us', '200@s.whatsapp.net');
    assert.match(sent[0][1].text, /Only group admins or sudo users/);
});

test('screenshot command returns usage without invoking a provider when URL is absent', async () => {
    const sent = [];
    const sock = { sendMessage: async (...args) => { sent.push(args); } };
    await handleSsCommand(sock, 'chat@s.whatsapp.net', { key: { id: 'x' } }, '');
    assert.match(sent[0][1].text, /SCREENSHOT TOOL/);
});
