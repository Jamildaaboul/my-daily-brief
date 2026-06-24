require('dotenv').config();
const express = require('express');
const Database = require('better-sqlite3');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Database Setup
const db = new Database('database.sqlite');
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY, email TEXT, telegram_chat_id TEXT, email_notif INTEGER, telegram_notif INTEGER
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, due_date TEXT, reminder_time TEXT, email_notif INTEGER, telegram_notif INTEGER
  );
`);

// Telegram & Email Setup
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

// API Routes
app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

app.get('/api/settings', (req, res) => {
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  res.json(settings || {});
});

app.post('/api/settings', (req, res) => {
  // Accepts telegram_chat_id or phone (just in case)
  const telegram_chat_id = req.body.telegram_chat_id || req.body.phone;
  const email = req.body.email;
  const email_notif = req.body.email_notif;
  const telegram_notif = req.body.telegram_notif || req.body.sms_notif;
  
  db.prepare(`INSERT OR REPLACE INTO settings (id, email, telegram_chat_id, email_notif, telegram_notif) VALUES (1, ?, ?, ?, ?)`).run(email, telegram_chat_id, email_notif ? 1 : 0, telegram_notif ? 1 : 0);
  res.json({ success: true });
});

app.get('/api/tasks', (req, res) => {
  const tasks = db.prepare('SELECT * FROM tasks ORDER BY due_date ASC').all();
  res.json(tasks);
});

app.post('/api/tasks', (req, res) => {
  const { title, due_date, reminder_time } = req.body;
  const email_notif = req.body.email_notif;
  const telegram_notif = req.body.telegram_notif || req.body.sms_notif;
  
  db.prepare(`INSERT INTO tasks (title, due_date, reminder_time, email_notif, telegram_notif) VALUES (?, ?, ?, ?, ?)`).run(title, due_date, reminder_time, email_notif ? 1 : 0, telegram_notif ? 1 : 0);
  res.json({ success: true });
});

app.delete('/api/tasks/:id', (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Cron Job for Reminders
cron.schedule('* * * * *', () => {
  // FIX: Get LOCAL time in YYYY-MM-DDTHH:MM format to match the HTML input
  const now = new Date();
  now.setHours(now.getHours() - 5);
  const pad = n => n.toString().padStart(2, '0');
  const nowString = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  
  console.log(`⏰ Checking for reminders at: ${nowString}`);
  const tasks = db.prepare('SELECT * FROM tasks WHERE reminder_time = ?').all(nowString);
  
  if (tasks.length > 0) {
    console.log(`✅ Found ${tasks.length} task(s) to remind!`);
  }

  tasks.forEach(task => {
    console.log(`⏰ Sending reminder for: ${task.title}`);
    
    if (task.email_notif) {
      const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
      if (settings && settings.email) {
        transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: settings.email,
          subject: `Reminder: ${task.title}`,
          text: `Your task "${task.title}" is due at ${task.due_date}!`
        }).then(() => console.log(`✅ Email sent to ${settings.email}`))
          .catch(err => console.error('❌ Email error:', err));
      }
    }
    
    if (task.telegram_notif) {
      const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
      if (settings && settings.telegram_chat_id) {
        bot.sendMessage(settings.telegram_chat_id, `⏰ Reminder: "${task.title}" is due at ${task.due_date}!`)
          .then(() => console.log(`📱 Telegram sent to ${settings.telegram_chat_id}`))
          .catch(err => console.error('❌ Telegram error:', err));
      }
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ My Daily Brief Server Running on port ${PORT}!`);
});
// DAILY SUMMARY (7:00 AM Central Time = 12:00 PM UTC)
cron.schedule('0 12 * * *', () => {
  console.log('📧 Generating Daily Summary...');
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  if (!settings || !settings.email_notif) return;

  const now = new Date();
  now.setHours(now.getHours() - 5); // Adjust to Central Time
  const todayStr = now.toISOString().split('T')[0]; // Gets '2026-06-23'

  const tasks = db.prepare("SELECT * FROM tasks WHERE reminder_time LIKE ?").all(todayStr + '%');

  if (tasks.length > 0) {
    let list = tasks.map(t => `• ${t.title} at ${t.reminder_time.split('T')[1]}`).join('\n');
    let msg = `Good morning! Here are your tasks for today:\n\n${list}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: settings.email,
      subject: '☀️ Your Daily Brief',
      text: msg
    }).then(() => console.log('✅ Daily summary sent!'))
      .catch(err => console.error('❌ Summary error:', err.message));
  } else {
    console.log('No tasks for today.');
  }
});
// --- DAILY SUMMARY (7:00 AM Central Time) ---
cron.schedule('0 12 * * *', () => {
  console.log('📧 Generating Daily Summary...');
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  if (!settings || !settings.email_notif) return;

  const now = new Date();
  now.setHours(now.getHours() - 5); // Adjust to Central Time
  const todayStr = now.toISOString().split('T')[0]; 

  const tasks = db.prepare("SELECT * FROM tasks WHERE reminder_time LIKE ?").all(todayStr + '%');

  if (tasks.length > 0) {
    let list = tasks.map(t => `• ${t.title} at ${t.reminder_time.split('T')[1]}`).join('\n');
    let msg = `Good morning! Here are your tasks for today:\n\n${list}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: settings.email,
      subject: '☀️ Your Daily Brief',
      text: msg
    }).then(() => console.log('✅ Daily summary sent!'))
      .catch(err => console.error('❌ Summary error:', err.message));
  }
});
// --- DAILY SUMMARY (7:00 AM Central Time) ---
cron.schedule('0 12 * * *', () => {
  console.log('📧 Generating Daily Summary...');
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  if (!settings || !settings.email_notif) return;

  const now = new Date();
  now.setHours(now.getHours() - 5); // Adjust to Central Time
  const todayStr = now.toISOString().split('T')[0]; 

  const tasks = db.prepare("SELECT * FROM tasks WHERE reminder_time LIKE ?").all(todayStr + '%');

  if (tasks.length > 0) {
    let list = tasks.map(t => `• ${t.title} at ${t.reminder_time.split('T')[1]}`).join('\n');
    let msg = `Good morning! Here are your tasks for today:\n\n${list}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: settings.email,
      subject: '️ Your Daily Brief',
      text: msg
    }).then(() => console.log('✅ Daily summary sent!'))
      .catch(err => console.error(' Summary error:', err.message));
  }
});
