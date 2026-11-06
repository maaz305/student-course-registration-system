const router = require("express").Router();
const db = require("../db");

router.get("/", async (req, res, next) => {
  try {
    const [rows] = await db.query(
      "SELECT course_id, course_code, course_name, credits, department, semester FROM courses ORDER BY course_id DESC"
    );
    res.json(rows);
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const { course_code, course_name, credits, department, semester } = req.body;
    if (![course_code, course_name, credits, department, semester].every(v => String(v ?? "").trim() !== "")) {
      return res.status(400).json({ message: "All course fields are required." });
    }
    const [result] = await db.execute(
      "INSERT INTO courses (course_code, course_name, credits, department, semester) VALUES (?, ?, ?, ?, ?)",
      [course_code.trim(), course_name.trim(), Number(credits), department.trim(), Number(semester)]
    );
    const [rows] = await db.execute("SELECT * FROM courses WHERE course_id=?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "Course code already exists." });
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const { course_code, course_name, credits, department, semester } = req.body;
    if (![course_code, course_name, credits, department, semester].every(v => String(v ?? "").trim() !== "")) {
      return res.status(400).json({ message: "All course fields are required." });
    }
    const [result] = await db.execute(
      "UPDATE courses SET course_code=?, course_name=?, credits=?, department=?, semester=? WHERE course_id=?",
      [course_code.trim(), course_name.trim(), Number(credits), department.trim(), Number(semester), Number(req.params.id)]
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Course not found." });
    const [rows] = await db.execute("SELECT * FROM courses WHERE course_id=?", [Number(req.params.id)]);
    res.json(rows[0]);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "Course code already exists." });
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const [result] = await db.execute("DELETE FROM courses WHERE course_id=?", [Number(req.params.id)]);
    if (!result.affectedRows) return res.status(404).json({ message: "Course not found." });
    res.json({ message: "Course deleted successfully." });
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") return res.status(409).json({ message: "This course has registrations. Cancel/delete those registrations before deleting it." });
    next(error);
  }
});

module.exports = router;
