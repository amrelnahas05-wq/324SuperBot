// Runs once before index.js starts (see Dockerfile CMD).
//
// index.js authenticates via useMultiFileAuthState('./session') — it reads a
// LOCAL FOLDER on disk, not an environment variable. This script bridges that:
// it takes the SESSION_ID produced by pairing/index.js (a base64-encoded zip
// of the whole auth-state folder) and unpacks it into ./session so the bot
// can find it on boot.
//
// If ./session already has a working creds.json (e.g. a redeploy where the
// volume persisted), this script does nothing — it never overwrites a live
// session with an older SESSION_ID env var.

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const SESSION_DIR = path.join(__dirname, 'session');
const CREDS_FILE = path.join(SESSION_DIR, 'creds.json');

function alreadyHasSession() {
    return fs.existsSync(CREDS_FILE);
}

function restoreFromEnv() {
    const sessionId = process.env.SESSION_ID;

    if (!sessionId) {
        console.log('[restore-session] No SESSION_ID env var set — skipping restore.');
        console.log('[restore-session] Either ./session already has creds, or you need to run the pairing tool.');
        return;
    }

    try {
        const zipBuffer = Buffer.from(sessionId, 'base64');
        const zip = new AdmZip(zipBuffer);

        fs.mkdirSync(SESSION_DIR, { recursive: true });
        zip.extractAllTo(SESSION_DIR, /* overwrite */ true);

        if (fs.existsSync(CREDS_FILE)) {
            console.log('[restore-session] Session restored from SESSION_ID successfully.');
        } else {
            console.error('[restore-session] Extracted SESSION_ID but no creds.json was found inside it.');
            console.error('[restore-session] Double-check the SESSION_ID was copied in full, with no line breaks.');
        }
    } catch (err) {
        console.error('[restore-session] Failed to decode/extract SESSION_ID:', err.message);
        console.error('[restore-session] The bot will still start, but will likely need re-pairing.');
    }
}

if (alreadyHasSession()) {
    console.log('[restore-session] ./session/creds.json already exists — using existing session, not touching it.');
} else {
    restoreFromEnv();
}
