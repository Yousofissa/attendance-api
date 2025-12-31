const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

// Health check
app.get("/", (req, res) => {
  res.json({ ok: true, message: "Student Attendance API is running" });
});

// Create tables (run once)
app.post("/setup", async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        full_name TEXT NOT NULL,
        student_code TEXT UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('Present','Absent','Late')),
        UNIQUE(student_id, date)
      );
    `);

    res.json({ ok: true, message: "Tables created/verified ✅" });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Add student
app.post("/students", async (req, res) => {
  const { full_name, student_code } = req.body;
  if (!full_name || !student_code) return res.status(400).json({ ok: false, message: "Missing fields" });

  try {
    const result = await pool.query(
      "INSERT INTO students (full_name, student_code) VALUES ($1, $2) RETURNING *",
      [full_name, student_code]
    );
    res.json({ ok: true, student: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// List students
app.get("/students", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM students ORDER BY id DESC");
    res.json({ ok: true, students: result.rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Mark attendance
app.post("/attendance", async (req, res) => {
  const { student_id, date, status } = req.body;
  if (!student_id || !date || !status) return res.status(400).json({ ok: false, message: "Missing fields" });

  try {
    const result = await pool.query(
      `
      INSERT INTO attendance (student_id, date, status)
      VALUES ($1, $2, $3)
      ON CONFLICT (student_id, date)
      DO UPDATE SET status = EXCLUDED.status
      RETURNING *
      `,
      [student_id, date, status]
    );
    res.json({ ok: true, attendance: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Get attendance by date
app.get("/attendance", async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ ok: false, message: "date query required" });

  try {
    const result = await pool.query(
      `
      SELECT a.id, a.date, a.status, s.id as student_id, s.full_name, s.student_code
      FROM attendance a
      JOIN students s ON s.id = a.student_id
      WHERE a.date = $1
      ORDER BY s.full_name ASC
      `,
      [date]
    );

    res.json({ ok: true, records: result.rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));
