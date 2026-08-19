const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const AdmZip = require('adm-zip');
const QRCode = require('qrcode');
const {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    makeCacheableSignalKeyStore,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const { createPairingAccessMiddleware } = require('../lib/pairingAccess');

const app = express();
const PORT = process.env.PORT || 3000;
const sessions = new Map();
const PAIRING_SESSION_TTL_MS = 5 * 60 * 1000;

app.disable('x-powered-by');
app.use((_, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
});
app.use(express.json({ limit: '2kb' }));
app.use(express.static(path.join(__dirname, 'public')));

function removeSession(sessionId) {
    const entry = sessions.get(sessionId);
    if (!entry) return;
    clearTimeout(entry.cleanupTimer);
    try { entry.sock?.end(); } catch (_) {}
    fs.rmSync(entry.sessionDir, { recursive: true, force: true });
    sessions.delete(sessionId);
}

function packSessionDir(sessionDir) {
    const zip = new AdmZip();
    zip.addLocalFolder(sessionDir);
    return zip.toBuffer().toString('base64');
}

app.post('/pair', createPairingAccessMiddleware(), async (_req, res) => {
    const sessionId = crypto.randomUUID();
    const sessionDir = path.join(__dirname, 'temp_sessions', sessionId);
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

        if (state.creds.registered) {
            sock.end();
            fs.rmSync(sessionDir, { recursive: true, force: true });
            return res.status(400).json({ error: 'This session is already registered. Start a new session.' });
        }

        const entry = {
            sock,
            saveCreds,
            sessionDir,
            qr: null,
            ready: false,
            sessionData: null,
            cleanupTimer: null,
        };
        sessions.set(sessionId, entry);
        entry.cleanupTimer = setTimeout(() => removeSession(sessionId), PAIRING_SESSION_TTL_MS);
        sock.ev.on('creds.update', saveCreds);

        let resolveQr;
        let rejectQr;
        const qrPromise = new Promise((resolve, reject) => {
            resolveQr = resolve;
            rejectQr = reject;
        });
        const qrTimeout = setTimeout(() => {
            rejectQr(new Error('Timed out waiting for a WhatsApp QR code'));
        }, 30000);

        sock.ev.on('connection.update', async (update) => {
            const { connection, qr, lastDisconnect } = update;

            if (qr) {
                try {
                    entry.qr = await QRCode.toDataURL(qr, { margin: 2, width: 360 });
                    clearTimeout(qrTimeout);
                    resolveQr(entry.qr);
                } catch (err) {
                    clearTimeout(qrTimeout);
                    rejectQr(err);
                }
            }

            if (connection === 'open') {
                await saveCreds();
                await new Promise((resolve) => setTimeout(resolve, 1500));
                entry.ready = true;
                entry.sessionData = packSessionDir(sessionDir);
                sock.end();
            }

            if (connection === 'close' && !entry.ready) {
                const reason = lastDisconnect?.error?.output?.statusCode;
                if (!entry.qr) {
                    clearTimeout(qrTimeout);
                    rejectQr(new Error(`WhatsApp connection closed${reason ? ` (${reason})` : ''}`));
                }
            }
        });

        const qr = await qrPromise;
        return res.json({ sessionId, qr });
    } catch (err) {
            removeSession(sessionId);
            return res.status(500).json({ error: 'Failed to generate QR code: ' + err.message });
    }
});

app.get('/session/:sessionId', createPairingAccessMiddleware(), (req, res) => {
    const entry = sessions.get(req.params.sessionId);
    if (!entry) return res.status(404).json({ status: 'not_found' });
    if (!entry.ready) return res.json({ status: 'pending', qr: entry.qr });

    const sessionId = entry.sessionData;
    removeSession(req.params.sessionId);
    return res.json({ status: 'ready', sessionId });
});

app.listen(PORT, () => {
    console.log(`324-servant-Bot QR pairing server running on port ${PORT}`);
});
