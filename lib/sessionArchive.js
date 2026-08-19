const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const MAX_ARCHIVE_BYTES = 4 * 1024 * 1024;
const MAX_ENTRY_COUNT = 128;
const MAX_UNCOMPRESSED_BYTES = 8 * 1024 * 1024;
const SAFE_SESSION_FILE = /^[A-Za-z0-9@._-]{1,180}\.json$/;

function decodeSessionArchive(serializedSession) {
    const normalized = String(serializedSession || '').replace(/\s+/g, '');
    if (!normalized || normalized.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) {
        throw new Error('Session data is not valid base64.');
    }

    const archiveBuffer = Buffer.from(normalized, 'base64');
    if (!archiveBuffer.length || archiveBuffer.length > MAX_ARCHIVE_BYTES) {
        throw new Error(`Session archive must be between 1 byte and ${MAX_ARCHIVE_BYTES} bytes.`);
    }

    return archiveBuffer;
}

function validateArchiveEntryName(entryName) {
    const normalized = String(entryName || '').replace(/\\/g, '/');
    if (!normalized || normalized.endsWith('/') || normalized.includes('/') || normalized !== path.basename(normalized)) {
        throw new Error(`Unsafe session archive path: ${entryName}`);
    }
    if (!SAFE_SESSION_FILE.test(normalized)) {
        throw new Error(`Unexpected session archive file: ${entryName}`);
    }
    return normalized;
}

function extractSessionArchive(archiveBuffer, sessionDir) {
    const zip = new AdmZip(archiveBuffer);
    const entries = zip.getEntries().filter((entry) => !entry.isDirectory);

    if (!entries.length || entries.length > MAX_ENTRY_COUNT) {
        throw new Error(`Session archive must contain between 1 and ${MAX_ENTRY_COUNT} files.`);
    }

    const preparedEntries = entries.map((entry) => {
        const name = validateArchiveEntryName(entry.entryName);
        const declaredSize = Number(entry.header?.size || 0);
        if (!Number.isSafeInteger(declaredSize) || declaredSize < 0 || declaredSize > MAX_UNCOMPRESSED_BYTES) {
            throw new Error(`Invalid or oversized session archive entry: ${name}`);
        }
        return { entry, name, declaredSize };
    });

    const declaredTotal = preparedEntries.reduce((total, item) => total + item.declaredSize, 0);
    if (declaredTotal > MAX_UNCOMPRESSED_BYTES) {
        throw new Error(`Session archive expands beyond ${MAX_UNCOMPRESSED_BYTES} bytes.`);
    }

    fs.mkdirSync(sessionDir, { recursive: true, mode: 0o700 });
    const resolvedSessionDir = path.resolve(sessionDir) + path.sep;

    for (const { entry, name, declaredSize } of preparedEntries) {
        const destination = path.resolve(sessionDir, name);
        if (!destination.startsWith(resolvedSessionDir)) {
            throw new Error(`Unsafe extraction destination: ${name}`);
        }

        const data = entry.getData();
        if (data.length !== declaredSize || data.length > MAX_UNCOMPRESSED_BYTES) {
            throw new Error(`Session archive entry size mismatch: ${name}`);
        }
        fs.writeFileSync(destination, data, { mode: 0o600 });
    }

    return preparedEntries.map(({ name }) => name);
}

module.exports = { decodeSessionArchive, extractSessionArchive, validateArchiveEntryName };
