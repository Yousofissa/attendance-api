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

      CREATE TABLE IF NOT EXISTS classes (
        id SERIAL PRIMARY KEY,
        class_name TEXT UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS enrollments (
        student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        class_id INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        PRIMARY KEY (student_id, class_id)
      );

      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        class_id INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('Present','Absent','Late')),
        UNIQUE(student_id, class_id, date)
      );
    `);

    res.json({ ok: true, message: "Tables created/verified ✅" });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Add students in bulk
app.post("/students/bulk", async (req, res) => {
  const { students } = req.body;

  if (!Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ ok: false, message: "students array required" });
  }

  try {
    const inserted = [];

    for (const s of students) {
      if (!s.full_name || !s.student_code) continue;

      const result = await pool.query(
        "INSERT INTO students (full_name, student_code) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING *",
        [s.full_name, s.student_code]
      );

      if (result.rows.length > 0) {
        inserted.push(result.rows[0]);
      }
    }

    res.json({ ok: true, inserted });
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
app.post("/enroll", async (req, res) => {
  const { student_id, class_id } = req.body;
  if (!student_id || !class_id) return res.status(400).json({ ok: false, message: "Missing fields" });

  try {
    await pool.query(
      "INSERT INTO enrollments (student_id, class_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
      [student_id, class_id]
    );
    res.json({ ok: true, message: "Enrolled ✅" });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

 app.get("/classes/:id/students", async (req, res) => {
   const classId = req.params.id;
   try {
     const result = await pool.query(
       `
       SELECT s.id, s.full_name, s.student_code
       FROM enrollments e
       JOIN students s ON s.id = e.student_id
       WHERE e.class_id = $1
       ORDER BY s.full_name ASC
       `,
       [classId]
     );
     res.json({ ok: true, students: result.rows });
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
app.post("/classes", async (req, res) => {
  const { class_name } = req.body;
  if (!class_name) return res.status(400).json({ ok: false, message: "Missing class_name" });

  try {
    const result = await pool.query(
      "INSERT INTO classes (class_name) VALUES ($1) RETURNING *",
      [class_name]
    );
    res.json({ ok: true, cls: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});


// Mark attendance
app.post("/attendance", async (req, res) => {
  const { student_id, class_id, date, status } = req.body;
  if (!student_id || !class_id || !date || !status)
    return res.status(400).json({ ok: false, message: "Missing fields" });

  try {
    const result = await pool.query(
      `
      INSERT INTO attendance (student_id, class_id, date, status)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (student_id, class_id, date)
      DO UPDATE SET status = EXCLUDED.status
      RETURNING *
      `,
      [student_id, class_id, date, status]
    );
    res.json({ ok: true, attendance: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/classes", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM classes ORDER BY class_name ASC");
    res.json({ ok: true, classes: result.rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/attendance/class", async (req, res) => {
  const { class_id, date } = req.query;
  if (!class_id || !date) return res.status(400).json({ ok: false, message: "class_id and date required" });

  try {
    const result = await pool.query(
      `SELECT student_id, status
       FROM attendance
       WHERE class_id = $1 AND date = $2`,
      [class_id, date]
    );
    res.json({ ok: true, records: result.rows });
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
app.post("/attendance/bulk", async (req, res) => {
  const { class_id, date, items } = req.body;
  if (!class_id || !date || !Array.isArray(items)) {
    return res.status(400).json({ ok: false, message: "class_id, date, items required" });
  }

  try {
    for (const it of items) {
      await pool.query(
        `
        INSERT INTO attendance (student_id, class_id, date, status)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (student_id, class_id, date)
        DO UPDATE SET status = EXCLUDED.status
        `,
        [it.student_id, class_id, date, it.status]
      );
    }
    res.json({ ok: true, message: "Attendance saved ✅" });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));
