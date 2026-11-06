const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./db');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', async (req, res) => {
  try {
    const [[dbRow]] = await db.query('SELECT DATABASE() AS database_name');
    const [[students]] = await db.query('SELECT COUNT(*) AS total FROM students');
    const [[courses]] = await db.query('SELECT COUNT(*) AS total FROM courses');
    const [[registrations]] = await db.query('SELECT COUNT(*) AS total FROM registrations');
    res.json({ ok: true, database: dbRow.database_name, counts: { students: students.total, courses: courses.total, registrations: registrations.total } });
  } catch (e) { res.status(500).json({ ok: false, message: e.message, code: e.code }); }
});
app.use('/api/students', require('./routes/students'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/registrations', require('./routes/registrations'));
const frontend = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontend));
app.get('/', (req, res) => res.sendFile(path.join(frontend, 'index.html')));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: err.code === 'ER_NO_SUCH_TABLE' ? 'A required database table is missing. Check database/schema.sql.' : (err.message || 'Server error'), code: err.code });
});
const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`Student Course Registration System running at http://localhost:${port}\nDatabase configured: ${process.env.DB_NAME || 'course_registration_db'}`));
