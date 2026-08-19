// commands/satr.js

const arabicList = require('../data/arabic-list.json');

async function sendSatr(sock, chatId) {
  const items = Array.isArray(arabicList.items)
    ? arabicList.items.filter((item) => typeof item === 'string' && item.trim())
    : [];

  if (items.length === 0) {
    await sock.sendMessage(chatId, {
      text: '❌ لا توجد عناصر في القائمة العربية حاليًا.',
    });
    return;
  }

  const randomItem = items[Math.floor(Math.random() * items.length)];

  await sock.sendMessage(chatId, {
    text: randomItem,
  });
}

module.exports = { sendSatr };
