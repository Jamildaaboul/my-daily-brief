const db = require('better-sqlite3')('database.sqlite');
const task = db.prepare('SELECT * FROM tasks ORDER BY id DESC LIMIT 1').get();
console.log('Last task found:', task);
db.prepare('UPDATE tasks SET telegram_notif = 1 WHERE id = ?').run(task.id);
console.log('Fixed task ID:', task.id);
