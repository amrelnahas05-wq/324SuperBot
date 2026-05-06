const express = require('express');
const path = require('path');
const fs = require('fs');
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

        if (!sock.authState.creds.registered) {
            const code = await sock.requestPairingCode(cleaned);
            const formatted = code.match(/.{1,4}/g).join('-');

            sessions.set(cleaned, { sock, saveCreds, sessionDir, ready: false, sessionId: null });

            sock.ev.on('creds.update', saveCreds);

            sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect } = update;

                if (connection === 'open') {
                    await saveCreds();
                    const credsFile = path.join(sessionDir, 'creds.json');
                    if (fs.existsSync(credsFile)) {
                        const creds = fs.readFileSync(credsFile, 'utf8');
                        const sessionId = Buffer.from(creds).toString('base64');
                        const entry = sessions.get(cleaned);
                        if (entry) {
                            entry.ready = true;
                            entry.sessionId = sessionId;
                        }
                    }
                    sock.end();
                }

                if (connection === 'close') {
                    const reason = lastDisconnect?.error?.output?.statusCode;
                    if (reason !== DisconnectReason.loggedOut) {
                        // cleanup
                    }
                }
            });

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
