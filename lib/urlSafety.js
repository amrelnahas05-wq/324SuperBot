const net = require('net');
const dns = require('dns').promises;

function isPrivateIPv4(address) {
    const parts = address.split('.').map(Number);
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
    const [a, b] = parts;
    return a === 0 || a === 10 || a === 127 ||
        (a === 100 && b >= 64 && b <= 127) ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 198 && (b === 18 || b === 19)) ||
        a >= 224;
}

function isPrivateIPv6(address) {
    const normalized = address.toLowerCase();
    return normalized === '::' || normalized === '::1' ||
        normalized.startsWith('fc') || normalized.startsWith('fd') ||
        normalized.startsWith('fe80:') || normalized.startsWith('::ffff:');
}

function isPrivateAddress(address) {
    const family = net.isIP(address);
    if (family === 4) return isPrivateIPv4(address);
    if (family === 6) return isPrivateIPv6(address);
    return true;
}

async function assertSafePublicHttpUrl(rawUrl) {
    let parsed;
    try {
        parsed = new URL(String(rawUrl || '').trim());
    } catch (_) {
        throw new Error('Please provide a valid URL.');
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Only http:// and https:// URLs are supported.');
    }
    if (parsed.username || parsed.password) {
        throw new Error('URLs with embedded credentials are not allowed.');
    }

    const hostname = parsed.hostname.toLowerCase();
    if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost') ||
        hostname.endsWith('.local') || hostname.endsWith('.internal') ||
        hostname === 'metadata.google.internal') {
        throw new Error('Local and internal network addresses are not allowed.');
    }

    if (net.isIP(hostname)) {
        if (isPrivateAddress(hostname)) throw new Error('Private network addresses are not allowed.');
        return parsed;
    }

    let addresses;
    try {
        addresses = await dns.lookup(hostname, { all: true, verbatim: true });
    } catch (_) {
        throw new Error('The website host could not be resolved.');
    }

    if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
        throw new Error('Private or unsafe website addresses are not allowed.');
    }

    return parsed;
}

module.exports = { assertSafePublicHttpUrl };
