import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load local variables for local development
dotenv.config({ path: '.env.local' });
dotenv.config(); // fallback to .env if any

import { dbService } from './dbService';
import { INITIAL_STUDENTS, INITIAL_VOLUNTEERS, INITIAL_SCHEDULE, INITIAL_TOPICS } from '../constants';
import { initDb } from './database';

// Initialize the database schema for Vercel/Neon if tables do not exist
initDb().catch(console.error);

const app = express();
app.use(express.json({ limit: '10mb' }) as any); // Increased limit for full data sync

// --- Clerk Admin Endpoints ---
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

// GET Clerk Users
app.get('/api/users', async (req, res) => {
    try {
        if (!CLERK_SECRET_KEY) throw new Error('Missing CLERK_SECRET_KEY');
        const response = await fetch('https://api.clerk.com/v1/users?limit=100', {
            headers: {
                'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error("Failed to fetch Clerk users");
        const users = await response.json();

        // Map to a cleaner format
        const mappedUsers = users.map((u: any) => ({
            id: u.id,
            email: u.email_addresses?.[0]?.email_address || '',
            firstName: u.first_name || '',
            lastName: u.last_name || '',
            role: u.public_metadata?.role || 'Ministra'
        }));

        res.status(200).json(mappedUsers);
    } catch (error) {
        console.error("Error fetching Clerk users:", error);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

// PATCH Clerk User Role
app.patch('/api/users/:id/role', async (req, res) => {
    try {
        if (!CLERK_SECRET_KEY) throw new Error('Missing CLERK_SECRET_KEY');
        const { id } = req.params;
        const { role } = req.body;

        const response = await fetch(`https://api.clerk.com/v1/users/${id}/metadata`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                public_metadata: { role }
            })
        });

        if (!response.ok) throw new Error("Failed to update Clerk user metadata");
        res.status(200).json({ message: "Role updated successfully" });
    } catch (error) {
        console.error("Error updating Clerk user role:", error);
        res.status(500).json({ error: "Failed to update role" });
    }
});

// --- API Endpoints ---

// GET all data
app.get('/api/data', async (req, res) => {
    try {
        const data = await dbService.getAllData();
        res.json(data);
    } catch (error) {
        console.error("Error fetching data from SQLite:", error);
        res.status(500).json({ error: "Failed to fetch data" });
    }
});

// Mark/Unmark Presence
app.post('/api/attendance', async (req, res) => {
    const { studentId, date, present, day, dailyCode } = req.body;
    try {
        await dbService.updateAttendance(studentId, date, present, day, dailyCode);
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
        await dbService.updateDismissal(studentId, date, responsibleName);
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

        await dbService.addStudent(newStudent);
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
            const allData = await dbService.getAllData();
            const currentStudent = allData.students.find((s: any) => s.id === id);
            if (!currentStudent) return res.status(404).json({ error: 'Student not found' });

            finalData = { ...currentStudent, ...payload };
        }

        await dbService.updateStudent(id, finalData);
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
        await dbService.deleteStudent(id);
        res.status(200).json({ message: 'Student deleted' });
    } catch (error) {
        console.error("Error deleting student:", error);
        res.status(500).json({ error: error instanceof Error ? error.message : "Failed to delete student" });
    }
});

// Add Topic
app.post('/api/topics', async (req, res) => {
    const { id, date, title, description } = req.body;
    try {
        await dbService.addTopic(date, title, description, id);
        res.status(201).json({ message: 'Topic created' });
    } catch (error) {
        console.error("Error adding topic:", error);
        res.status(500).json({ error: "Failed to create topic" });
    }
});

// Update Topic
app.put('/api/topics/:id', async (req, res) => {
    const { id } = req.params;
    const { date, title, description } = req.body;
    try {
        await dbService.updateTopic(id, date, title, description);
        res.status(200).json({ message: 'Topic updated' });
    } catch (error) {
        console.error("Error updating topic:", error);
        res.status(500).json({ error: "Failed to update topic" });
    }
});

// Delete Topic
app.delete('/api/topics/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await dbService.deleteTopic(id);
        res.status(200).json({ message: 'Topic deleted' });
    } catch (error) {
        console.error("Error deleting topic:", error);
        res.status(500).json({ error: "Failed to delete topic" });
    }
});

// Download Lesson Plan (serves physical docx in /data/topics or compiles a fallback doc file)
app.get('/api/download-lesson', async (req, res) => {
    const { fileName, title, description, date, className } = req.query;
    if (!fileName) {
        return res.status(400).json({ error: 'Missing fileName parameter' });
    }

    const dataPathCapitalized = path.join(process.cwd(), 'data', 'Topics');
    const dataPathLowercase = path.join(process.cwd(), 'data', 'topics');
    
    let filePath = path.join(dataPathCapitalized, String(fileName));
    console.log(`[DOWNLOAD] Requesting file name: ${fileName}`);
    console.log(`[DOWNLOAD] Checking path: ${filePath}`);

    try {
        let fileExists = fs.existsSync(filePath);
        if (!fileExists) {
            const fallbackPath = path.join(dataPathLowercase, String(fileName));
            console.log(`[DOWNLOAD] Capitalized path not found. Checking lowercase path: ${fallbackPath}`);
            if (fs.existsSync(fallbackPath)) {
                filePath = fallbackPath;
                fileExists = true;
                console.log(`[DOWNLOAD] File found at lowercase path: ${filePath}`);
            } else {
                console.log(`[DOWNLOAD] File not found anywhere. Falling back to dynamic doc generation.`);
            }
        } else {
            console.log(`[DOWNLOAD] File found at capitalized path: ${filePath}`);
        }

        if (fileExists) {
            res.download(filePath, String(fileName));
        } else {
            const tTitle = title ? String(title) : 'Assunto da Aula';
            const tDesc = description ? String(description) : '';
            const tDate = date ? String(date) : '';
            const tClass = className ? String(className) : '';

            const formattedDate = tDate ? new Date(tDate + 'T00:00:00').toLocaleDateString('pt-BR') : '';

            const htmlContent = `
                <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                <head>
                  <title>Aula - ${tTitle}</title>
                  <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; }
                    h1 { color: #3B82F6; font-size: 24px; border-bottom: 2px solid #3B82F6; padding-bottom: 5px; }
                    .meta-box { background-color: #F3F4F6; border: 1px solid #E5E7EB; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
                    .meta-item { margin-bottom: 5px; }
                    .meta-label { font-weight: bold; color: #4B5563; }
                    .content { font-size: 14px; color: #1F2937; }
                    .section-title { font-size: 18px; font-weight: bold; color: #1F2937; border-bottom: 1px solid #E5E7EB; padding-bottom: 3px; margin-top: 25px; margin-bottom: 10px; }
                  </style>
                </head>
                <body>
                  <h1>AULA - MUNDO KIDS</h1>
                  
                  <div class="meta-box">
                    <div class="meta-item"><span class="meta-label">Data da Aula:</span> ${formattedDate}</div>
                    <div class="meta-item"><span class="meta-label">Turma:</span> ${tClass}</div>
                    <div class="meta-item"><span class="meta-label">Assunto / Tema:</span> ${tTitle}</div>
                  </div>
                  
                  <div class="section-title">Conteúdo / Descrição do Ensino</div>
                  <div class="content">
                    ${tDesc.replace(/\n/g, '<br/>')}
                  </div>
                  
                  <div class="section-title">Anotações da Aula</div>
                  <div class="content">
                    <p style="color: #9CA3AF; font-style: italic;">Use este espaço para suas anotações pessoais durante a aplicação da aula...</p>
                  </div>
                </body>
                </html>
            `;

            res.setHeader('Content-Type', 'application/msword');
            res.setHeader('Content-Disposition', `attachment; filename="${String(fileName).replace(/\.docx$/, '.doc')}"`);
            res.send('\ufeff' + htmlContent);
        }
    } catch (error) {
        console.error("Download error:", error);
        res.status(500).json({ error: "Failed to download lesson plan" });
    }
});

// --- Volunteers CRUD ---
app.post('/api/volunteers', async (req, res) => {
    try {
        await dbService.addVolunteer(req.body);
        res.status(201).json({ message: 'Volunteer created' });
    } catch (error) {
        console.error("Error adding volunteer:", error);
        res.status(500).json({ error: "Failed to create volunteer" });
    }
});

app.put('/api/volunteers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await dbService.updateVolunteer(id, req.body);
        res.status(200).json({ message: 'Volunteer updated' });
    } catch (error) {
        console.error("Error updating volunteer:", error);
        res.status(500).json({ error: "Failed to update volunteer" });
    }
});

app.delete('/api/volunteers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await dbService.deleteVolunteer(id);
        res.status(200).json({ message: 'Volunteer deleted' });
    } catch (error) {
        console.error("Error deleting volunteer:", error);
        res.status(500).json({ error: "Failed to delete volunteer" });
    }
});

// --- Schedule CRUD ---
app.post('/api/schedule', async (req, res) => {
    try {
        await dbService.addSchedule(req.body);
        res.status(201).json({ message: 'Schedule created' });
    } catch (error) {
        console.error("Error adding schedule:", error);
        res.status(500).json({ error: "Failed to create schedule" });
    }
});

app.put('/api/schedule/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await dbService.updateSchedule(id, req.body);
        res.status(200).json({ message: 'Schedule updated' });
    } catch (error) {
        console.error("Error updating schedule:", error);
        res.status(500).json({ error: "Failed to update schedule" });
    }
});

app.delete('/api/schedule/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await dbService.deleteSchedule(id);
        res.status(200).json({ message: 'Schedule deleted' });
    } catch (error) {
        console.error("Error deleting schedule:", error);
        res.status(500).json({ error: "Failed to delete schedule" });
    }
});

// Save All Data (Manual Sync/Overwrite)
app.post('/api/save-all', async (req, res) => {
    try {
        const { students, volunteers, schedule, topics } = req.body;

        if (!students || !volunteers || !schedule || !topics) {
            return res.status(400).json({ error: "Missing data fields" });
        }

        await dbService.seedDatabase({
            students,
            volunteers,
            schedule,
            topics
        });
        res.status(200).json({ message: "Data saved successfully to SQLite." });
    } catch (error) {
        console.error("Save all error:", error);
        res.status(500).json({ error: "Failed to save data" });
    }
});

// Seed Database from Constants
app.post('/api/seed', async (req, res) => {
    try {
        await dbService.seedDatabase({
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

// Standalone Server Support
if (typeof require !== 'undefined' && require.main === module) {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`API Server running on port ${port}`);
    });
} else if (process.env.NODE_ENV !== 'production') {
    // Fallback for local testing if ESM
    const port = process.env.PORT || 3000;
    if (typeof process !== 'undefined' && process.argv[1] && process.argv[1].includes('index.ts')) {
        app.listen(port, () => {
            console.log(`API Server running on port ${port}`);
        });
    }
}

export default app;
if (typeof module !== 'undefined') {
    module.exports = app;
}