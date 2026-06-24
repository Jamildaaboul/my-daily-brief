const db = require('better-sqlite3')('database.sqlite');
db.prepare("UPDATE settings SET telegram_chat_id='7828487079' WHERE id=1").run();
db.prepare("INSERT INTO tasks (title, due_date, reminder_time, email_notif, telegram_notif) VALUES ('TEST', '2026-06-23T13:00', '2026-06-23T12:12', 1, 1)").run();
console.log('Database fixed!');
