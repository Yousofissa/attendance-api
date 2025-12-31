// server.js (UPDATED - COPY/PASTE FULL FILE)
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

// ---------- helpers ----------
const normalizeStatus = (s) => {
  if (!s) return null;
  const x = String(s).trim().toLowerCase();
  if (x === "present") return "Present";
  if (x === "absent" || x === "absence") return "Absent";
  if (x === "late") return "Late";
  return null;
};

const parseISODate = (d) => {
  if (!d) return null;
  const s = String(d).trim();
  // Expect YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
};

// ---------- routes ----------
app.get("/", (req, res) => {
  res.json({ ok: true, message: "Student Attendance API is running" });
});

// Debug: check DB + quick counts
app.get("/debug", async (req, res) => {
  try {
    const db = await pool.query(`SELECT current_database() AS db;`);
    const counts = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM students)  AS students,
        (SELECT COUNT(*) FROM classes)   AS classes,
        (SELECT COUNT(*) FROM enrollments) AS enrollments,
        (SELECT COUNT(*) FROM attendance)  AS attendance;
    `);
    res.json({ ok: true, db: db.rows[0], counts: counts.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Setup tables (safe)
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

// Create/Reset attendance table ONLY (use once if schema mismatched)
app.post("/reset/attendance", async (req, res) => {
  try {
    await pool.query(`
      DROP TABLE IF EXISTS attendance;

      CREATE TABLE attendance (
        id SERIAL PRIMARY KEY,
        student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        class_id INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('Present','Absent','Late')),
        UNIQUE(student_id, class_id, date)
      );
    `);
    res.json({ ok: true, message: "attendance table reset ✅" });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Add ONE student
app.post("/students", async (req, res) => {
  const { full_name, student_code } = req.body;
  if (!full_name || !student_code) {
    return res.status(400).json({ ok: false, message: "Missing fields" });
  }

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

// Add students in bulk
app.post("/students/bulk", async (req, res) => {
  const { students } = req.body;

  if (!Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ ok: false, message: "students array required" });
  }

  try {
    const inserted = [];
    const skipped = [];

    for (const s of students) {
      if (!s.full_name || !s.student_code) {
        skipped.push({ reason: "missing fields", student: s });
        continue;
      }

      const result = await pool.query(
        "INSERT INTO students (full_name, student_code) VALUES ($1,$2) ON CONFLICT (student_code) DO NOTHING RETURNING *",
        [s.full_name, s.student_code]
      );

      if (result.rows.length > 0) inserted.push(result.rows[0]);
      else skipped.push({ reason: "duplicate student_code", student: s });
    }

    res.json({ ok: true, inserted_count: inserted.length, inserted, skipped_count: skipped.length, skipped });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// List students
app.get("/students", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM students ORDER BY id ASC");
    res.json({ ok: true, students: result.rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Create class
app.post("/classes", async (req, res) => {
  const { class_name } = req.body;
  if (!class_name) return res.status(400).json({ ok: false, message: "Missing class_name" });

  try {
    const result = await pool.query(
      "INSERT INTO classes (class_name) VALUES ($1) ON CONFLICT (class_name) DO NOTHING RETURNING *",
      [class_name]
    );
    res.json({ ok: true, cls: result.rows[0] ?? null, message: result.rows[0] ? "Created ✅" : "Already exists ✅" });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// List classes
app.get("/classes", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM classes ORDER BY class_name ASC");
    res.json({ ok: true, classes: result.rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Enroll ONE (expects DB student id)
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

// Enroll MANY (expects DB student ids)
app.post("/enroll/bulk", async (req, res) => {
  const { class_id, student_ids } = req.body;
  if (!class_id || !Array.isArray(student_ids) || student_ids.length === 0) {
    return res.status(400).json({ ok: false, message: "class_id and student_ids[] required" });
  }

  try {
    let enrolled = 0;

    for (const sid of student_ids) {
      const r = await pool.query(
        "INSERT INTO enrollments (student_id, class_id) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING 1",
        [sid, class_id]
      );
      enrolled += r.rowCount;
    }

    res.json({ ok: true, message: "Bulk enrolled ✅", enrolled });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Get students for a class
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

// Mark ONE attendance (expects DB student id)
app.post("/attendance", async (req, res) => {
  const { student_id, class_id, date, status } = req.body;

  const iso = parseISODate(date);
  const st = normalizeStatus(status);

  if (!student_id || !class_id || !iso || !st) {
    return res.status(400).json({
      ok: false,
      message: "Required: student_id (DB id), class_id, date(YYYY-MM-DD), status(Present/Absent/Late)",
    });
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO attendance (student_id, class_id, date, status)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (student_id, class_id, date)
      DO UPDATE SET status = EXCLUDED.status
      RETURNING *
      `,
      [student_id, class_id, iso, st]
    );

    res.json({ ok: true, attendance: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Save attendance BULK (expects DB student ids)
app.post("/attendance/bulk", async (req, res) => {
  const { class_id, date, items } = req.body;

  const iso = parseISODate(date);
  if (!class_id || !iso || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ ok: false, message: "class_id, date(YYYY-MM-DD), items[] required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Ensure class exists
    const cls = await client.query("SELECT id FROM classes WHERE id = $1", [class_id]);
    if (cls.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ ok: false, message: "class_id not found in classes table" });
    }

    // Validate students exist (DB ids!)
    const studentIds = items.map((x) => x.student_id).filter(Boolean);
    const existing = await client.query(
      `SELECT id FROM students WHERE id = ANY($1::int[])`,
      [studentIds]
    );
    const existingSet = new Set(existing.rows.map((r) => r.id));
    const missing = studentIds.filter((id) => !existingSet.has(id));

    if (missing.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        ok: false,
        message: "Some student_id values do not exist in students table (must be DB ids, not student_code)",
        missing_student_ids: missing,
      });
    }

    let affected = 0;

    for (const it of items) {
      const st = normalizeStatus(it.status);
      if (!it.student_id || !st) continue;

      const r = await client.query(
        `
        INSERT INTO attendance (student_id, class_id, date, status)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (student_id, class_id, date)
        DO UPDATE SET status = EXCLUDED.status
        RETURNING 1
        `,
        [it.student_id, class_id, iso, st]
      );
      affected += r.rowCount;
    }

    await client.query("COMMIT");
    res.json({ ok: true, message: "Attendance saved ✅", affected });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    client.release();
  }
});

// Get attendance for class+date
app.get("/attendance/class", async (req, res) => {
  const { class_id, date } = req.query;
  const iso = parseISODate(date);

  if (!class_id || !iso) return res.status(400).json({ ok: false, message: "class_id and date(YYYY-MM-DD) required" });

  try {
    const result = await pool.query(
      `
      SELECT student_id, status
      FROM attendance
      WHERE class_id = $1 AND date = $2
      ORDER BY student_id ASC
      `,
      [class_id, iso]
    );
    res.json({ ok: true, records: result.rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Get attendance by date (all classes)
app.get("/attendance", async (req, res) => {
  const { date } = req.query;
  const iso = parseISODate(date);
  if (!iso) return res.status(400).json({ ok: false, message: "date(YYYY-MM-DD) query required" });

  try {
    const result = await pool.query(
      `
      SELECT a.id, a.class_id, a.date, a.status,
             s.id as student_id, s.full_name, s.student_code
      FROM attendance a
      JOIN students s ON s.id = a.student_id
      WHERE a.date = $1
      ORDER BY a.class_id ASC, s.full_name ASC
      `,
      [iso]
    );
    res.json({ ok: true, records: result.rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));
