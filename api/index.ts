import express from 'express';
import { googleSheetsService } from './googleSheetsService';
import { INITIAL_STUDENTS, INITIAL_VOLUNTEERS, INITIAL_SCHEDULE, INITIAL_TOPICS } from '../constants';

const app = express();
app.use(express.json({ limit: '10mb' }) as any); // Increased limit for full data sync

// --- API Endpoints ---

// GET all data
app.get('/api/data', async (req, res) => {
    try {
        const data = await googleSheetsService.getAllData();
        res.json(data);
    } catch (error) {
        console.error("Error fetching data from Sheets:", error);
        res.status(500).json({ error: "Failed to fetch data" });
    }
});

// Mark/Unmark Presence
app.post('/api/attendance', async (req, res) => {
    const { studentId, date, present, day } = req.body;
    try {
        await googleSheetsService.updateAttendance(studentId, date, present, day);
        res.status(200).json({ message: 'Attendance updated' });
    } catch (error) {
        console.error("Error updating attendance:", error);
        res.status(500).json({ error: "Failed to update attendance" });
    }
});

// Record Dismissal
app.post('/api/dismissal', async (req, res) => {
    const { studentId, responsibleName, date } = req.body;
    try {
        await googleSheetsService.updateDismissal(studentId, date, responsibleName);
        res.status(200).json({ message: 'Dismissal updated' });
    } catch (error) {
        console.error("Error recording dismissal:", error);
        res.status(500).json({ error: error instanceof Error ? error.message : "Failed to record dismissal" });
    }
});

// Add Student
app.post('/api/students', async (req, res) => {
    const newStudent = req.body;
    try {
        // Ensure ID exists if not passed
        if (!newStudent.id) newStudent.id = Date.now().toString();
        
        await googleSheetsService.addStudent(newStudent);
        res.status(201).json({ message: 'Student created' });
    } catch (error) {
        console.error("Error adding student:", error);
        res.status(500).json({ error: "Failed to create student" });
    }
});

// Update Student (Edit or Make Member)
app.put('/api/students/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const payload = req.body;
        
        // Se for um update parcial (ex: só type), precisamos dos dados originais
        const needsMerge = !payload.name || !payload.class; 
        
        let finalData = payload;

        if (needsMerge) {
            const allData = await googleSheetsService.getAllData();
            const currentStudent = allData.students.find((s: any) => s.id === id);
            if (!currentStudent) return res.status(404).json({ error: 'Student not found' });
            
            finalData = { ...currentStudent, ...payload };
        }

        await googleSheetsService.updateStudent(id, finalData);
        res.status(200).json({ message: 'Student updated' });
    } catch (error) {
        console.error("Error updating student:", error);
        res.status(500).json({ error: "Failed to update student" });
    }
});

// Delete Student
app.delete('/api/students/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await googleSheetsService.deleteStudent(id);
        res.status(200).json({ message: 'Student deleted' });
    } catch (error) {
        console.error("Error deleting student:", error);
        res.status(500).json({ error: error instanceof Error ? error.message : "Failed to delete student" });
    }
});

// Add Topic
app.post('/api/topics', async (req, res) => {
    const { date, title, description } = req.body;
    try {
        await googleSheetsService.addTopic(date, title, description);
        res.status(201).json({ message: 'Topic created' });
    } catch (error) {
        console.error("Error adding topic:", error);
        res.status(500).json({ error: "Failed to create topic" });
    }
});

// Save All Data (Manual Sync/Overwrite)
app.post('/api/save-all', async (req, res) => {
    try {
        const { students, volunteers, schedule, topics } = req.body;
        
        if (!students || !volunteers || !schedule || !topics) {
             return res.status(400).json({ error: "Missing data fields" });
        }

        await googleSheetsService.seedDatabase({
            students,
            volunteers,
            schedule,
            topics
        });
        res.status(200).json({ message: "Data saved successfully to Google Sheets." });
    } catch (error) {
        console.error("Save all error:", error);
        res.status(500).json({ error: "Failed to save data" });
    }
});

// Seed Database from Constants
app.post('/api/seed', async (req, res) => {
    try {
        await googleSheetsService.seedDatabase({
            students: INITIAL_STUDENTS,
            volunteers: INITIAL_VOLUNTEERS,
            schedule: INITIAL_SCHEDULE,
            topics: INITIAL_TOPICS
        });
        res.status(200).json({ message: "Database seeded successfully from constants." });
    } catch (error) {
        console.error("Seed error:", error);
        res.status(500).json({ error: "Failed to seed database" });
    }
});

export default app;