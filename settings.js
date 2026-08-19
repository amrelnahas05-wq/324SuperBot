const settings = {
  packname: 'ii324BOT',
  author: 'ii324',
  botName: 'ii324BOT',
  botOwner: process.env.BOT_OWNER_NAME || 'Bot Owner',
  timezone: 'Africa/Cairo',
  prefix: '.',
  ownerNumber: process.env.BOT_OWNER_NUMBER || '',
  AUTO_STATUS_REACT: 'false',
  AUTO_STATUS_REPLY: 'false',
  AUTO_STATUS_MSG: 'Status Viewed ii324BOT',
  AUTORECORD: 'false',
  AUTOTYPE: 'false',
  AUTORECORDTYPE: 'false',
  giphyApiKey: process.env.GIPHY_API_KEY || '',
  commandMode: 'public',
  description: 'This is a bot for managing group commands and automating tasks.',
  version: '2.0.0',
};

module.exports = settings;
