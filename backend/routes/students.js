const router = require("express").Router();
const db = require("../db");

router.get("/", async (req, res, next) => {
  try {
    const [rows] = await db.query(
      "SELECT student_id, name, roll_no, branch, email FROM students ORDER BY student_id DESC"
    );
    res.json(rows);
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const { name, roll_no, branch, email } = req.body;
    if (![name, roll_no, branch, email].every(v => String(v || "").trim())) {
      return res.status(400).json({ message: "All student fields are required." });
    }
    const [result] = await db.execute(
      "INSERT INTO students (name, roll_no, branch, email) VALUES (?, ?, ?, ?)",
      [name.trim(), roll_no.trim(), branch.trim(), email.trim()]
    );
    const [rows] = await db.execute("SELECT student_id, name, roll_no, branch, email FROM students WHERE student_id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "Roll number or email already exists." });
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const { name, roll_no, branch, email } = req.body;
    if (![name, roll_no, branch, email].every(v => String(v || "").trim())) {
      return res.status(400).json({ message: "All student fields are required." });
    }
    const [result] = await db.execute(
      "UPDATE students SET name=?, roll_no=?, branch=?, email=? WHERE student_id=?",
      [name.trim(), roll_no.trim(), branch.trim(), email.trim(), Number(req.params.id)]
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Student not found." });
    const [rows] = await db.execute("SELECT student_id, name, roll_no, branch, email FROM students WHERE student_id=?", [Number(req.params.id)]);
    res.json(rows[0]);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "Roll number or email already exists." });
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const [result] = await db.execute("DELETE FROM students WHERE student_id=?", [Number(req.params.id)]);
    if (!result.affectedRows) return res.status(404).json({ message: "Student not found." });
    res.json({ message: "Student deleted successfully." });
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") return res.status(409).json({ message: "This student has course registrations. Cancel/delete those registrations before deleting the student." });
    next(error);
  }
});

module.exports = router;
