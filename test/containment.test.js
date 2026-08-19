const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const AdmZip = require('adm-zip');
const { evaluatePairingAccess } = require('../lib/pairingAccess');
const { decodeSessionArchive, extractSessionArchive, validateArchiveEntryName } = require('../lib/sessionArchive');
const { validateRuntimeConfig } = require('../lib/runtimeConfig');

test('pairing access fails closed unless enabled and protected by the configured bearer token', () => {
    const configured = { PAIRING_ENABLED: 'true', PAIRING_API_TOKEN: 'a'.repeat(32) };
    assert.equal(evaluatePairingAccess({ PAIRING_ENABLED: 'false' }, 'Bearer anything').allowed, false);
    assert.equal(evaluatePairingAccess(configured, 'Bearer wrong').allowed, false);
    assert.equal(evaluatePairingAccess(configured, `Bearer ${configured.PAIRING_API_TOKEN}`).allowed, true);
});

test('session archive validation rejects invalid base64 and unsafe entry paths', () => {
    assert.throws(() => decodeSessionArchive('not-base64!'), /valid base64/);
    assert.throws(() => validateArchiveEntryName('../creds.json'), /Unsafe session archive path/);
    assert.throws(() => validateArchiveEntryName('session/../creds.json'), /Unsafe session archive path/);
    assert.throws(() => validateArchiveEntryName('session.exe'), /Unexpected session archive file/);
});

test('session archives extract only safe JSON files into the designated session directory', () => {
    const zip = new AdmZip();
    zip.addFile('creds.json', Buffer.from('{"me":"safe"}', 'utf8'));
    const target = fs.mkdtempSync(path.join(os.tmpdir(), 'superbot-session-'));
    const extracted = extractSessionArchive(zip.toBuffer(), target);

    assert.deepEqual(extracted, ['creds.json']);
    assert.equal(fs.readFileSync(path.join(target, 'creds.json'), 'utf8'), '{"me":"safe"}');
    fs.rmSync(target, { recursive: true, force: true });
});

test('legacy session folders restore safely while extracting only the JSON filename', () => {
    const zip = new AdmZip();
    zip.addFile('legacy-session/creds.json', Buffer.from('{"me":"safe"}', 'utf8'));
    zip.addFile('legacy-session/app-state-sync-version.json', Buffer.from('{"version":1}', 'utf8'));
    const target = fs.mkdtempSync(path.join(os.tmpdir(), 'superbot-legacy-session-'));
    const extracted = extractSessionArchive(zip.toBuffer(), target);

    assert.deepEqual(extracted.sort(), ['app-state-sync-version.json', 'creds.json']);
    assert.equal(fs.readFileSync(path.join(target, 'creds.json'), 'utf8'), '{"me":"safe"}');
    fs.rmSync(target, { recursive: true, force: true });
});

test('runtime configuration requires a valid owner and a strong pairing token when pairing is enabled', () => {
    assert.deepEqual(validateRuntimeConfig({}), { ownerNumber: '', hasOwnerNumber: false });
    assert.throws(
        () => validateRuntimeConfig({ BOT_OWNER_NUMBER: '201060715493', PAIRING_ENABLED: 'true', PAIRING_API_TOKEN: 'short' }),
        /PAIRING_API_TOKEN/,
    );
    assert.equal(validateRuntimeConfig({ BOT_OWNER_NUMBER: '+201060715493' }).ownerNumber, '201060715493');
    assert.equal(validateRuntimeConfig({ BOT_OWNER_NUMBER: '+201060715493' }).hasOwnerNumber, true);
    assert.throws(
        () => validateRuntimeConfig({ BOT_OWNER_NUMBER: '1234567890123456' }),
        /BOT_OWNER_NUMBER/,
    );
});

test('configured owner access is derived from the environment rather than committed sudo data', () => {
    const { isSudoUser } = require('../lib/sudoUsers');
    process.env.BOT_OWNER_NUMBER = '201060715493';
    assert.equal(isSudoUser('201060715493@s.whatsapp.net'), true);
});
