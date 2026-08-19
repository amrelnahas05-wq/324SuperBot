const crypto = require('crypto');

function getBearerToken(authorization = '') {
    const match = /^Bearer\s+(.+)$/i.exec(String(authorization).trim());
    return match ? match[1].trim() : '';
}

function tokensMatch(received, expected) {
    const receivedBuffer = Buffer.from(String(received || ''), 'utf8');
    const expectedBuffer = Buffer.from(String(expected || ''), 'utf8');

    return receivedBuffer.length === expectedBuffer.length
        && receivedBuffer.length > 0
        && crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

function evaluatePairingAccess(environment = process.env, authorization = '') {
    if (environment.PAIRING_ENABLED !== 'true') {
        return { allowed: false, status: 404, error: 'Pairing is disabled.' };
    }

    const expectedToken = String(environment.PAIRING_API_TOKEN || '').trim();
    if (expectedToken.length < 24) {
        return { allowed: false, status: 503, error: 'Pairing is unavailable because PAIRING_API_TOKEN is not securely configured.' };
    }

    if (!tokensMatch(getBearerToken(authorization), expectedToken)) {
        return { allowed: false, status: 401, error: 'Unauthorized pairing request.' };
    }

    return { allowed: true };
}

function createPairingAccessMiddleware(environment = process.env) {
    return (req, res, next) => {
        const result = evaluatePairingAccess(environment, req.get('authorization'));
        if (!result.allowed) return res.status(result.status).json({ error: result.error });
        return next();
    };
}

module.exports = { createPairingAccessMiddleware, evaluatePairingAccess, getBearerToken, tokensMatch };
