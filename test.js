const db = require('better-sqlite3')('database.sqlite');
db.prepare("INSERT INTO tasks (title, due_date, reminder_time, email_notif, telegram_notif) VALUES ('Shell Test', '2026-06-23T14:00', '2026-06-23T12:58', 1, 1)").run();
console.log('Task added for 12:58');
