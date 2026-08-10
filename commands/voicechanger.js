const fs = require('fs');
const os = require('os');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const getFakeVcard = require('../lib/fakeVcard');

// WhatsApp voice notes are encoded as 48kHz opus/ogg, so filters are tuned to that rate.
const SAMPLE_RATE = 48000;

const EFFECTS = {
    chipmunk: {
        filter: `asetrate=${SAMPLE_RATE}*1.5,aresample=${SAMPLE_RATE},atempo=0.6667`,
        label: 'chipmunk',
    },
    deep: {
        filter: `asetrate=${SAMPLE_RATE}*0.75,aresample=${SAMPLE_RATE},atempo=1.3333`,
        label: 'deep',
    },
    woman: {
        // Raises pitch while keeping the original timing.
        filter: `asetrate=${SAMPLE_RATE}*1.28,aresample=${SAMPLE_RATE},atempo=0.78125,highpass=f=100,treble=g=2`,
        label: 'woman',
    },
    robot: {
        filter: 'aecho=0.8:0.88:60:0.4,chorus=0.5:0.9:50:0.4:0.25:2',
        label: 'robot',
    },
    echo: {
        filter: 'aecho=0.8:0.9:700:0.35',
        label: 'echo',
    },
    radio: {
        filter: 'highpass=f=300,lowpass=f=3000,acompressor=threshold=-18dB:ratio=4:attack=5:release=50',
        label: 'radio',
    },
};

function getQuotedAudio(message) {
    const ctxInfo = message.message?.extendedTextMessage?.contextInfo
        || message.message?.contextInfo;
    const quoted = ctxInfo?.quotedMessage;
    if (quoted?.audioMessage) return quoted.audioMessage;
    if (message.message?.audioMessage) return message.message.audioMessage;
    return null;
}

function removeTempFiles(directory) {
    try {
        fs.rmSync(directory, { recursive: true, force: true });
    } catch (_) {
        // Temporary cleanup should never mask the command result.
    }
}

async function voiceChangerCommand(sock, chatId, message, args = []) {
    const audioMessage = getQuotedAudio(message);
    const effectName = String(args[0] || 'robot').toLowerCase();
    const effect = EFFECTS[effectName];

    if (!audioMessage) {
        await sock.sendMessage(chatId, {
            text: '❌ Reply to a voice note or audio with `.voicechanger <effect>`.\n\n' +
                `Available effects: ${Object.keys(EFFECTS).join(', ')}\n` +
                'Example: `.voicechanger woman`',
        }, { quoted: getFakeVcard() });
        return;
    }

    if (!effect) {
        await sock.sendMessage(chatId, {
            text: `❌ Unknown effect: ${effectName}\n\nAvailable effects: ${Object.keys(EFFECTS).join(', ')}`,
        }, { quoted: getFakeVcard() });
        return;
    }

    const workDirectory = fs.mkdtempSync(path.join(os.tmpdir(), '324bot-voice-'));
    const inputFile = path.join(workDirectory, 'input.ogg');
    const outputFile = path.join(workDirectory, 'output.ogg');

    try {
        await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });

        const stream = await downloadContentFromMessage(audioMessage, 'audio');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        fs.writeFileSync(inputFile, Buffer.concat(chunks));

        await new Promise((resolve, reject) => {
            ffmpeg(inputFile)
                .audioFilters(effect.filter)
                .audioCodec('libopus')
                .audioBitrate('64k')
                .outputOptions(['-application', 'voip'])
                .format('ogg')
                .on('end', resolve)
                .on('error', reject)
                .save(outputFile);
        });

        await sock.sendMessage(chatId, {
            audio: fs.readFileSync(outputFile),
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true,
        }, { quoted: getFakeVcard() });
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
    } catch (error) {
        console.error('voicechanger error:', error);
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
        await sock.sendMessage(chatId, {
            text: '❌ Failed to transform that audio. Make sure it is a valid voice note and try again.',
        }, { quoted: getFakeVcard() });
    } finally {
        removeTempFiles(workDirectory);
    }
}

module.exports = voiceChangerCommand;
