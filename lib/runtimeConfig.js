function normalizePhoneNumber(value) {
    return String(value || '').replace(/[^0-9]/g, '');
}

function validateRuntimeConfig(environment = process.env) {
    const errors = [];
    const configuredOwnerNumber = String(environment.BOT_OWNER_NUMBER || '').trim();
    const ownerNumber = normalizePhoneNumber(configuredOwnerNumber);

    if (configuredOwnerNumber && (ownerNumber.length < 8 || ownerNumber.length > 15)) {
        errors.push('BOT_OWNER_NUMBER must contain a valid WhatsApp number with country code.');
    }

    if (environment.PAIRING_ENABLED === 'true' && String(environment.PAIRING_API_TOKEN || '').trim().length < 24) {
        errors.push('PAIRING_API_TOKEN must be at least 24 characters when PAIRING_ENABLED=true.');
    }

    if (errors.length) {
        throw new Error(`Invalid runtime configuration: ${errors.join(' ')}`);
    }

    return {
        ownerNumber,
        hasOwnerNumber: Boolean(ownerNumber),
    };
}

module.exports = { normalizePhoneNumber, validateRuntimeConfig };
