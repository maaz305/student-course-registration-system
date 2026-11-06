const router = require("express").Router();
const db = require("../db");

const SELECT = `SELECT r.registration_id, r.student_id, r.course_id, r.registration_date, r.status,
 s.name AS student_name, s.roll_no, c.course_code, c.course_name
 FROM registrations r JOIN students s ON s.student_id=r.student_id
 JOIN courses c ON c.course_id=r.course_id`;

router.get("/", async (req, res, next) => {
  try {
    let sql = SELECT;
    const params = [];
    if (req.query.student_id) { sql += " WHERE r.student_id=?"; params.push(req.query.student_id); }
    sql += " ORDER BY r.registration_id DESC";
    const [rows] = await db.execute(sql, params);
    res.json(rows);
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const { student_id, course_id } = req.body;
    if (!student_id || !course_id) return res.status(400).json({ message: "Select a student and course." });
    const [result] = await db.execute(
      "INSERT INTO registrations (student_id, course_id, registration_date, status) VALUES (?, ?, CURDATE(), 'Registered')",
      [Number(student_id), Number(course_id)]
    );
    const [rows] = await db.execute(SELECT + " WHERE r.registration_id=?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "This student is already registered for this course." });
    if (error.code === "ER_NO_REFERENCED_ROW_2") return res.status(400).json({ message: "Selected student or course does not exist." });
    next(error);
  }
});

router.patch("/:id/status", async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["Registered", "Cancelled"].includes(status)) return res.status(400).json({ message: "Invalid status." });
    const [result] = await db.execute("UPDATE registrations SET status=? WHERE registration_id=?", [status, Number(req.params.id)]);
    if (!result.affectedRows) return res.status(404).json({ message: "Registration not found." });
    res.json({ message: "Registration status updated." });
  } catch (error) { next(error); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const [result] = await db.execute("DELETE FROM registrations WHERE registration_id=?", [Number(req.params.id)]);
    if (!result.affectedRows) return res.status(404).json({ message: "Registration not found." });
    res.json({ message: "Registration deleted." });
  } catch (error) { next(error); }
});

module.exports = router;
