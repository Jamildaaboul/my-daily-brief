const db = require('better-sqlite3')('database.sqlite');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

const now = new Date();
const pad = n => n.toString().padStart(2, '0');
const nowString = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

console.log('Current server time:', nowString);

const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
console.log('Settings:', settings);

if (settings && settings.telegram_chat_id) {
  console.log('Sending test Telegram message...');
  bot.sendMessage(settings.telegram_chat_id, '🧪 MANUAL TEST - If you see this, Telegram is working!')
    .then(() => console.log('✅ Telegram message sent successfully!'))
    .catch(err => console.error('❌ Telegram error:', err.message));
}
