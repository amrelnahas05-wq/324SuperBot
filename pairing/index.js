const express = require('express');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    makeCacheableSignalKeyStore,
} = require('@whiskeysockets/baileys');
const pino = require('pino');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const sessions = new Map();

function cleanPhone(phone) {
    return phone.replace(/[^0-9]/g, '');
}

// Packs the ENTIRE auth folder (creds.json + signal key files) into one
// base64 string. Encoding creds.json alone loses the pre-key/sync-key
// files Baileys also writes, which can make a restored session unstable.
function packSessionDir(sessionDir) {
    const zip = new AdmZip();
    zip.addLocalFolder(sessionDir);
    return zip.toBuffer().toString('base64');
}

app.post('/pair', async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number required' });

    const cleaned = cleanPhone(phone);
    if (cleaned.length < 7) return res.status(400).json({ error: 'Invalid phone number' });

    const sessionDir = path.join(__dirname, 'temp_sessions', cleaned);
    fs.mkdirSync(sessionDir, { recursive: true });

    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

        const sock = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
            },
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }),
            browser: ['324-servant-Bot', 'Chrome', '1.0.0'],
        });

        if (!state.creds.registered) {
            sessions.set(cleaned, { sock, saveCreds, sessionDir, ready: false, sessionId: null });
            sock.ev.on('creds.update', saveCreds);

            // Baileys may not have completed its initial handshake immediately
            // after makeWASocket(). Calling requestPairingCode() too early can
            // make WhatsApp close the socket before a code is returned. The qr
            // update is emitted when the socket is ready, even in pairing mode.
            let pairingCodeRequested = false;
            let pairingCodeResolve;
            let pairingCodeReject;
            const pairingCodePromise = new Promise((resolve, reject) => {
                pairingCodeResolve = resolve;
                pairingCodeReject = reject;
            });
            const pairingTimeout = setTimeout(() => {
                pairingCodeReject(new Error('Timed out waiting for WhatsApp connection'));
            }, 30000);

            sock.ev.on('connection.update', async (update) => {
                const { connection, qr, lastDisconnect } = update;

                if (qr && !pairingCodeRequested) {
                    pairingCodeRequested = true;
                    try {
                        const code = await sock.requestPairingCode(cleaned);
                        clearTimeout(pairingTimeout);
                        pairingCodeResolve(code);
                    } catch (err) {
                        clearTimeout(pairingTimeout);
                        pairingCodeReject(err);
                    }
                }

                if (connection === 'open') {
                    await saveCreds();
                    // Give Baileys a moment to flush signal key files to disk
                    // before we zip the directory.
                    await new Promise((resolve) => setTimeout(resolve, 1500));

                    const entry = sessions.get(cleaned);
                    if (entry) {
                        entry.ready = true;
                        entry.sessionId = packSessionDir(sessionDir);
                    }
                    sock.end();
                }

                if (connection === 'close' && !pairingCodeRequested) {
                    const reason = lastDisconnect?.error?.output?.statusCode;
                    clearTimeout(pairingTimeout);
                    pairingCodeReject(new Error(`WhatsApp connection closed${reason ? ` (${reason})` : ''}`));
                }
            });

            const code = await pairingCodePromise;
            const formatted = code.match(/.{1,4}/g).join('-');
            return res.json({ code: formatted });
        } else {
            fs.rmSync(sessionDir, { recursive: true, force: true });
            return res.status(400).json({ error: 'Session already registered. Clear temp_sessions and try again.' });
        }
    } catch (err) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
        return res.status(500).json({ error: 'Failed to generate pairing code: ' + err.message });
    }
});

app.get('/session/:phone', (req, res) => {
    const cleaned = cleanPhone(req.params.phone);
    const entry = sessions.get(cleaned);

    if (!entry) return res.status(404).json({ status: 'not_found' });
    if (!entry.ready) return res.json({ status: 'pending' });

    const sessionId = entry.sessionId;

    fs.rmSync(entry.sessionDir, { recursive: true, force: true });
    sessions.delete(cleaned);

    return res.json({ status: 'ready', sessionId });
});

app.listen(PORT, () => {
    console.log(`324-servant-Bot pairing server running on port ${PORT}`);
});
