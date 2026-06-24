const db = require('better-sqlite3')('database.sqlite');
db.prepare("UPDATE tasks SET reminder_time = '2026-06-23T10:20' WHERE id = 12").run();
console.log('Fixed year to 2026 and set time to 10:20!');
