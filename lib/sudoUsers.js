const fs = require('fs');
const path = require('path');

const SUDO_FILE = path.join(__dirname, '../data/sudo.json');

function normalizeUserId(userId) {
    return String(userId || '')
        .replace(/@s\.whatsapp\.net|@lid/gi, '')
        .replace(/[^0-9]/g, '');
}

function loadSudoUsers() {
    try {
        const parsed = fs.existsSync(SUDO_FILE)
            ? JSON.parse(fs.readFileSync(SUDO_FILE, 'utf8'))
            : { users: [] };
        const storedUsers = Array.isArray(parsed.users) ? parsed.users : [];
        const configuredOwner = normalizeUserId(process.env.BOT_OWNER_NUMBER);
        return { users: [...new Set([...storedUsers, configuredOwner].map(normalizeUserId).filter(Boolean))] };
    } catch (error) {
        console.error('[SUDO] Could not load sudo users:', error.message);
        return { users: [] };
    }
}

function saveSudoUsers(sudoUsers) {
    try {
        fs.mkdirSync(path.dirname(SUDO_FILE), { recursive: true });
        const configuredOwner = normalizeUserId(process.env.BOT_OWNER_NUMBER);
        const users = [...new Set((sudoUsers.users || [])
            .map(normalizeUserId)
            .filter((userId) => userId && userId !== configuredOwner))];
        fs.writeFileSync(SUDO_FILE, `${JSON.stringify({ users }, null, 2)}\n`);
        return true;
    } catch (error) {
        console.error('[SUDO] Could not save sudo users:', error.message);
        return false;
    }
}

function isSudoUser(userId) {
    const normalized = normalizeUserId(userId);
    return Boolean(normalized) && loadSudoUsers().users.includes(normalized);
}

function addSudoUser(userId) {
    const normalized = normalizeUserId(userId);
    if (!normalized) return false;

    const sudoUsers = loadSudoUsers();
    if (!sudoUsers.users.includes(normalized)) {
        sudoUsers.users.push(normalized);
        return saveSudoUsers(sudoUsers);
    }
    return true;
}

function removeSudoUser(userId) {
    const normalized = normalizeUserId(userId);
    const sudoUsers = loadSudoUsers();
    const users = sudoUsers.users.filter((entry) => entry !== normalized);
    return users.length === sudoUsers.users.length || saveSudoUsers({ users });
}

function getAllSudoUsers() {
    return loadSudoUsers().users;
}

module.exports = {
    normalizeUserId,
    loadSudoUsers,
    saveSudoUsers,
    isSudoUser,
    addSudoUser,
    removeSudoUser,
    getAllSudoUsers,
};
