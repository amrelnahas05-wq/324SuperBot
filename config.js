require('dotenv').config();

function readOptionalEnv(name) {
    return String(process.env[name] || '').trim();
}

global.APIs = {
    xteam: 'https://api.xteam.xyz',
    dzx: 'https://api.dhamzxploit.my.id',
    lol: 'https://api.lolhuman.xyz',
    violetics: 'https://violetics.pw',
    neoxr: 'https://api.neoxr.my.id',
    zenzapis: 'https://zenzapis.xyz',
    akuari: 'https://api.akuari.my.id',
    akuari2: 'https://apimu.my.id',
    nrtm: 'https://fg-nrtm.ddns.net',
    bg: 'http://bochil.ddns.net',
    fgmods: 'https://api-fgmods.ddns.net'
};

global.APIKeys = {
    'https://api.xteam.xyz': readOptionalEnv('XTEAM_API_KEY'),
    'https://api.lolhuman.xyz': readOptionalEnv('LOLHUMAN_API_KEY'),
    'https://api.neoxr.my.id': readOptionalEnv('NEOXR_API_KEY'),
    'https://violetics.pw': readOptionalEnv('VIOLETICS_API_KEY'),
    'https://zenzapis.xyz': readOptionalEnv('ZENZAPIS_API_KEY'),
    'https://api-fgmods.ddns.net': readOptionalEnv('FGMODS_API_KEY')
};

module.exports = {
    WARN_COUNT: 3,
    APIs: global.APIs,
    APIKeys: global.APIKeys
};
