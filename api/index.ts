import express from 'express';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';

const app = express();
app.use(express.json());

let dbPromise;

// The database file is included in the deployment and is available in the root
const dbPath = path.join(process.cwd(), 'database.db');

function getDb() {
    if (!dbPromise) {
        dbPromise = open({
            filename: dbPath,
            driver: sqlite3.Database,
            // NOTE: Vercel's serverless environment has a read-only filesystem except for /tmp.
            // This setup works for reading the initial DB. Writes will fail in that environment.
            // For a read/write setup on Vercel, a hosted database service is required.
            mode: sqlite3.OPEN_READWRITE, 
        }).catch(err => {
            console.error("Failed to open database:", err);
            // Reset promise to allow retries if it's a transient issue.
            dbPromise = null; 
            throw err;
        });
    }
    return dbPromise;
}

// GET all data
app.get('/api/data', async (req, res) => {
    try {
        const db = await getDb();
        const students = await db.all('SELECT * FROM students ORDER BY name');
        const attendance = await db.all('SELECT * FROM attendance');
        const volunteers = await db.all('SELECT * FROM volunteers ORDER BY name');
        const schedule = await db.all('SELECT * FROM schedule ORDER BY date');
        const topics = await db.all('SELECT * FROM topics ORDER BY date DESC');

        const studentsWithAttendance = students.map(student => ({
            ...student,
            attendance: attendance.filter(a => a.studentId === student.id)
        }));
        
        const scheduleWithArrays = schedule.map(s => ({
            ...s,
            ministerIds: s.ministerIds ? s.ministerIds.split(',') : []
        }));

        res.json({
            students: studentsWithAttendance,
            volunteers,
            schedule: scheduleWithArrays,
            topics
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// Mark/Unmark Presence
app.post('/api/attendance', async (req, res) => {
    const { studentId, date, present, day } = req.body;
    try {
        const db = await getDb();
        const existing = await db.get('SELECT id FROM attendance WHERE studentId = ? AND date = ?', [studentId, date]);
        if (existing) {
            await db.run('UPDATE attendance SET present = ?, day = ?, dismissedBy = ? WHERE id = ?', [present, day, null, existing.id]);
        } else if (present) { // Only insert if marking as present
            await db.run('INSERT INTO attendance (studentId, date, present, day) VALUES (?, ?, ?, ?)', [studentId, date, true, day]);
        }
        res.status(200).json({ message: 'Attendance updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update attendance' });
    }
});

// Record Dismissal
app.post('/api/dismissal', async (req, res) => {
    const { studentId, responsibleName, date } = req.body;
     try {
        const db = await getDb();
        await db.run('UPDATE attendance SET dismissedBy = ? WHERE studentId = ? AND date = ?', [responsibleName, studentId, date]);
        res.status(200).json({ message: 'Dismissal updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update dismissal' });
    }
});

// Add Student
app.post('/api/students', async (req, res) => {
    const { id, name, class: studentClass, age, motherName, phone, type } = req.body;
    try {
        const db = await getDb();
        await db.run('INSERT INTO students (id, name, class, age, motherName, phone, type) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, name, studentClass, age, motherName, phone, type]);
        res.status(201).json({ message: 'Student created' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create student' });
    }
});

// Update Student (Edit or Make Member)
app.put('/api/students/:id', async (req, res) => {
    const { id } = req.params;
    const { name, class: studentClass, age, motherName, phone, type } = req.body;
    try {
        const db = await getDb();
        if (type) { // For making a visitor a member
             await db.run('UPDATE students SET type = ? WHERE id = ?', [type, id]);
        } else { // For general editing
            await db.run('UPDATE students SET name = ?, class = ?, age = ?, motherName = ?, phone = ? WHERE id = ?',
            [name, studentClass, age, motherName, phone, id]);
        }
        res.status(200).json({ message: 'Student updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update student' });
    }
});

// Delete Student
app.delete('/api/students/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const db = await getDb();
        await db.run('DELETE FROM students WHERE id = ?', [id]);
        res.status(200).json({ message: 'Student deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete student' });
    }
});

// Add Topic
app.post('/api/topics', async (req, res) => {
    const { date, title, description } = req.body;
     try {
        const db = await getDb();
        await db.run('INSERT INTO topics (date, title, description) VALUES (?, ?, ?)', [date, title, description]);
        res.status(201).json({ message: 'Topic created' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create topic' });
    }
});

export default app;
