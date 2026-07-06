import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import webpush from 'web-push';
import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';

// Load local variables for local development
dotenv.config({ path: '.env.local' });
dotenv.config(); // fallback to .env if any

// Configure Web Push VAPID Details
const rawPublicKey = process.env.VAPID_PUBLIC_KEY;
const rawPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (rawPublicKey && rawPrivateKey) {
    const publicKey = rawPublicKey.replace(/^["']|["']$/g, '');
    const privateKey = rawPrivateKey.replace(/^["']|["']$/g, '');
    try {
        webpush.setVapidDetails(
            'mailto:contato@presencamundokids.com',
            publicKey,
            privateKey
        );
        console.log("Web Push VAPID details configured successfully.");
    } catch (err) {
        console.error("Error setting VAPID details on startup:", err);
    }
} else {
    console.warn("VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY is missing from environment variables. Web push notifications will be disabled.");
}

import { dbService } from './dbService';
import { INITIAL_STUDENTS, INITIAL_VOLUNTEERS, INITIAL_SCHEDULE, INITIAL_TOPICS } from '../constants';
import { initDb } from './database';

// Initialize the database schema for Vercel/Neon if tables do not exist
initDb().catch(console.error);

const app = express();
app.use(express.json({ limit: '10mb' }) as any); // Increased limit for full data sync

// Protect all /api endpoints
app.use('/api', ClerkExpressRequireAuth() as any);

// Role cache in memory
const roleCache = new Map<string, { role: string; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// --- Clerk Admin Endpoints ---
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

async function getUserRole(userId: string): Promise<string> {
    const cached = roleCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.role;
    }

    if (!CLERK_SECRET_KEY) throw new Error('Missing CLERK_SECRET_KEY');
    const response = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
        headers: {
            'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch user details from Clerk: ${response.statusText}`);
    }

    const userData: any = await response.json();
    const role = userData.public_metadata?.role || 'Ministra';
    
    roleCache.set(userId, {
        role,
        expiresAt: Date.now() + CACHE_TTL
    });

    return role;
}

const checkRole = (allowedRoles: string[]) => {
    return async (req: any, res: any, next: any) => {
        try {
            const userId = req.auth?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthenticated' });
            }

            const role = await getUserRole(userId);
            if (!allowedRoles.includes(role)) {
                return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
            }

            req.userRole = role;
            next();
        } catch (error) {
            console.error('Error in checkRole middleware:', error);
            res.status(500).json({ error: 'Failed to authorize user' });
        }
    };
};

// GET Clerk Users
app.get('/api/users', checkRole(['Pastor', 'Coordenadora']) as any, async (req, res) => {
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
        const mappedUsers = users.map((u: any) => {
            const role = u.public_metadata?.role || 'Ministra';
            const classroom = role === 'Pastor' ? 'Todas' : (u.public_metadata?.classroom || '');
            return {
                id: u.id,
                email: u.email_addresses?.[0]?.email_address || '',
                firstName: u.first_name || '',
                lastName: u.last_name || '',
                role,
                classroom
            };
        });

        res.status(200).json(mappedUsers);
    } catch (error) {
        console.error("Error fetching Clerk users:", error);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

// PATCH Clerk User Metadata (Role and/or Classroom)
app.patch('/api/users/:id/metadata', checkRole(['Pastor', 'Coordenadora']) as any, async (req, res) => {
    try {
        if (!CLERK_SECRET_KEY) throw new Error('Missing CLERK_SECRET_KEY');
        const { id } = req.params;
        const { role, classroom } = req.body;

        // Enforce: Coordenadora cannot edit classroom
        const callerRole = (req as any).userRole;
        if (callerRole === 'Coordenadora' && classroom !== undefined) {
            return res.status(403).json({ error: 'Forbidden: Coordenadoras cannot alter user classrooms.' });
        }

        const metadataUpdate: any = {};
        if (role !== undefined) metadataUpdate.role = role;
        if (classroom !== undefined) {
            metadataUpdate.classroom = role === 'Pastor' ? 'Todas' : classroom;
        } else if (role === 'Pastor') {
            metadataUpdate.classroom = 'Todas';
        }

        const response = await fetch(`https://api.clerk.com/v1/users/${id}/metadata`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                public_metadata: metadataUpdate
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error("Clerk PATCH metadata failed:", errBody);
            throw new Error("Failed to update Clerk user metadata");
        }
        res.status(200).json({ message: "Metadata updated successfully" });
    } catch (error) {
        console.error("Error updating Clerk user metadata:", error);
        res.status(500).json({ error: "Failed to update metadata" });
    }
});

// PATCH Clerk User Role (Deprecated fallback)
app.patch('/api/users/:id/role', checkRole(['Pastor', 'Coordenadora']) as any, async (req, res) => {
    try {
        if (!CLERK_SECRET_KEY) throw new Error('Missing CLERK_SECRET_KEY');
        const { id } = req.params;
        const { role } = req.body;

        const metadataUpdate: any = { role };
        if (role === 'Pastor') {
            metadataUpdate.classroom = 'Todas';
        }

        const response = await fetch(`https://api.clerk.com/v1/users/${id}/metadata`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                public_metadata: metadataUpdate
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
app.get('/api/data', checkRole(['Pastor', 'Coordenadora', 'Supervisora', 'Ministra']) as any, async (req, res) => {
    try {
        const data = await dbService.getAllData();
        res.json(data);
    } catch (error) {
        console.error("Error fetching data from SQLite:", error);
        res.status(500).json({ error: "Failed to fetch data" });
    }
});

// --- Web Push Endpoints ---

// Get public VAPID key
app.get('/api/push/key', checkRole(['Pastor', 'Coordenadora', 'Supervisora', 'Ministra']) as any, (req, res) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY?.replace(/^["']|["']$/g, '');
    if (!publicKey) {
        return res.status(500).json({ error: 'Push notifications are not configured on the server.' });
    }
    res.json({ publicKey });
});

// Subscribe to push notifications
app.post('/api/push/subscribe', checkRole(['Pastor', 'Coordenadora', 'Supervisora', 'Ministra']) as any, async (req, res) => {
    try {
        const { subscription, userEmail, userName, userRole } = req.body;
        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({ error: 'Invalid subscription object.' });
        }
        const id = crypto.createHash('sha256').update(subscription.endpoint).digest('hex');
        await dbService.addPushSubscription(id, JSON.stringify(subscription), userEmail, userName, userRole);
        res.status(201).json({ message: 'Push subscription saved.' });
    } catch (e) {
        console.error('Error saving subscription:', e);
        res.status(500).json({ error: 'Failed to subscribe.' });
    }
});

// Unsubscribe from push notifications
app.post('/api/push/unsubscribe', checkRole(['Pastor', 'Coordenadora', 'Supervisora', 'Ministra']) as any, async (req, res) => {
    try {
        const { endpoint } = req.body;
        if (!endpoint) {
            return res.status(400).json({ error: 'Missing subscription endpoint.' });
        }
        const id = crypto.createHash('sha256').update(endpoint).digest('hex');
        await dbService.removePushSubscription(id);
        res.status(200).json({ message: 'Push subscription removed.' });
    } catch (e) {
        console.error('Error removing subscription:', e);
        res.status(500).json({ error: 'Failed to unsubscribe.' });
    }
});

// Mark/Unmark Presence
app.post('/api/attendance', checkRole(['Pastor', 'Coordenadora', 'Supervisora', 'Ministra']) as any, async (req, res) => {
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
app.post('/api/dismissal', checkRole(['Pastor', 'Coordenadora', 'Supervisora', 'Ministra']) as any, async (req, res) => {
    const { studentId, responsibleName, date } = req.body;
    try {
        await dbService.updateDismissal(studentId, date, responsibleName);
        res.status(200).json({ message: 'Dismissal updated' });
    } catch (error) {
        console.error("Error recording dismissal:", error);
        res.status(500).json({ error: error instanceof Error ? error.message : "Failed to record dismissal" });
    }
});

// Helper to broadcast push notification to all subscribers when child is ready to leave
async function triggerPushBroadcast(studentId: string, date: string) {
    try {
        const allData = await dbService.getAllData();
        const student = allData.students.find((s: any) => String(s.id) === String(studentId));
        if (!student) return;

        const att = student.attendance.find((a: any) => a.date === date);
        const code = att?.dailyCode || '';
        const name = student.name;
        const className = student.class;

        const payload = JSON.stringify({
            title: 'Mundo Kids - Solicitação de Saída 🚪',
            body: `Código #${code}: ${name} (${className}) está aguardando liberação.`,
            url: '/?view=Presença'
        });

        // 1. Find who is scaled to this class on this date
        const scheduleToday = allData.schedule.filter((s: any) => s.date === date && s.className === className);
        
        // Collect volunteer IDs scaled today
        const scaledVolunteerIds = new Set<string>();
        scheduleToday.forEach((sch: any) => {
            if (sch.supervisorId) scaledVolunteerIds.add(String(sch.supervisorId));
            if (sch.deskId) scaledVolunteerIds.add(String(sch.deskId));
            if (sch.coordinatorId) scaledVolunteerIds.add(String(sch.coordinatorId));
            if (sch.ministerIds) {
                sch.ministerIds.forEach((id: string) => scaledVolunteerIds.add(String(id)));
            }
        });

        // Get all scaled volunteers names (lowercase, normalized)
        const scaledVolunteersNames = new Set<string>();
        allData.volunteers.forEach((v: any) => {
            if (scaledVolunteerIds.has(String(v.id))) {
                scaledVolunteersNames.add(v.name.toLowerCase().trim());
            }
        });

        console.log(`[PUSH BROADCAST] Scaled volunteers for ${className} on ${date}:`, Array.from(scaledVolunteersNames));

        const subscriptions = await dbService.getAllPushSubscriptions();
        console.log(`[PUSH BROADCAST] Found ${subscriptions.length} total subscriptions.`);

        // 2. Filter subscriptions to matching users
        const targets = subscriptions.filter((sub) => {
            try {
                if (!sub.userEmail) return false;

                // Coordinators and Pastors always receive all alerts
                const role = sub.userRole || 'Ministra';
                if (role === 'Pastor' || role === 'Coordenadora') {
                    return true;
                }

                // Teachers must be scaled today for this class
                const userName = (sub.userName || '').toLowerCase().trim();
                if (scaledVolunteersNames.has(userName)) {
                    return true;
                }

                // Fallback: name substring match
                for (const volName of scaledVolunteersNames) {
                    if (userName && (volName.includes(userName) || userName.includes(volName))) {
                        return true;
                    }
                }

                return false;
            } catch (e) {
                return false;
            }
        });

        console.log(`[PUSH BROADCAST] Broadcasting for ${name} (COD #${code}) to ${targets.length} filtered subscribers.`);

        const promises = targets.map(async (sub) => {
            try {
                const subObj = JSON.parse(sub.subscriptionJson);
                await webpush.sendNotification(subObj, payload);
            } catch (err: any) {
                // Clean up expired (404/410) subscriptions
                if (err.statusCode === 404 || err.statusCode === 410) {
                    console.log(`Subscription expired, removing: ${sub.id}`);
                    await dbService.removePushSubscription(sub.id);
                } else {
                    console.error(`Error sending push notification to subscriber ${sub.id}:`, err);
                }
            }
        });

        await Promise.all(promises);
    } catch (error) {
        console.error('Error in push broadcast helper:', error);
    }
}

// Update Awaiting Release (Ready to Leave) Status
app.post('/api/attendance/ready', checkRole(['Pastor', 'Coordenadora', 'Supervisora', 'Ministra']) as any, async (req, res) => {
    const { studentId, date, readyToLeave } = req.body;
    try {
        await dbService.updateReadyToLeave(studentId, date, readyToLeave);
        if (readyToLeave) {
            triggerPushBroadcast(studentId, date).catch(console.error);
        }
        res.status(200).json({ message: 'Ready to leave status updated' });
    } catch (error) {
        console.error("Error updating ready to leave status:", error);
        res.status(500).json({ error: "Failed to update ready to leave status" });
    }
});

// Undo/Reset Dismissal
app.post('/api/attendance/undo-dismissal', checkRole(['Pastor', 'Coordenadora', 'Supervisora', 'Ministra']) as any, async (req, res) => {
    const { studentId, date } = req.body;
    try {
        await dbService.resetDismissal(studentId, date);
        res.status(200).json({ message: 'Dismissal reset successfully' });
    } catch (error) {
        console.error("Error resetting dismissal:", error);
        res.status(500).json({ error: "Failed to undo dismissal" });
    }
});

// Add Student
app.post('/api/students', checkRole(['Pastor', 'Coordenadora', 'Supervisora']) as any, async (req, res) => {
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
app.put('/api/students/:id', checkRole(['Pastor', 'Coordenadora', 'Supervisora']) as any, async (req, res) => {
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
app.delete('/api/students/:id', checkRole(['Pastor', 'Coordenadora', 'Supervisora']) as any, async (req, res) => {
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
app.post('/api/topics', checkRole(['Pastor']) as any, async (req, res) => {
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
app.put('/api/topics/:id', checkRole(['Pastor']) as any, async (req, res) => {
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
app.delete('/api/topics/:id', checkRole(['Pastor']) as any, async (req, res) => {
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
app.get('/api/download-lesson', checkRole(['Pastor', 'Coordenadora', 'Supervisora', 'Ministra']) as any, async (req, res) => {
    const { fileName, title, description, date, className } = req.query;
    if (!fileName) {
        return res.status(400).json({ error: 'Missing fileName parameter' });
    }

    console.log(`[DOWNLOAD] Requesting file name: ${fileName}`);

    try {
        // 1. Try fetching from PostgreSQL database first
        try {
            const dbFile = await dbService.getLessonFile(String(fileName));
            if (dbFile) {
                if (dbFile.url) {
                    console.log(`[DOWNLOAD] File found in database with Vercel Blob URL: ${dbFile.url}. Fetching from private store...`);
                    const token = process.env.BLOB_READ_WRITE_TOKEN;
                    const blobRes = await fetch(dbFile.url, {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });
                    if (!blobRes.ok) {
                        throw new Error(`Failed to fetch from private Vercel Blob: ${blobRes.statusText}`);
                    }
                    const contentType = blobRes.headers.get('content-type') || 'application/octet-stream';
                    const contentDisposition = blobRes.headers.get('content-disposition') || `attachment; filename="${fileName}"`;
                    res.setHeader('Content-Type', contentType);
                    res.setHeader('Content-Disposition', contentDisposition);

                    const arrayBuffer = await blobRes.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    return res.send(buffer);
                }
                if (dbFile.filecontent) {
                    console.log(`[DOWNLOAD] File found in database with base64 content: ${fileName}`);
                    const buffer = Buffer.from(dbFile.filecontent, 'base64');
                    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
                    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
                    return res.send(buffer);
                }
            }
        } catch (dbErr) {
            console.error('[DOWNLOAD] Error reading from database:', dbErr);
        }

        // 2. Fallback to local files if database doesn't have it (e.g. pre-packaged files)
        const dataPathCapitalized = path.join(process.cwd(), 'data', 'Topics');
        const dataPathLowercase = path.join(process.cwd(), 'data', 'topics');
        
        let filePath = path.join(dataPathCapitalized, String(fileName));
        console.log(`[DOWNLOAD] Checking path: ${filePath}`);

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
app.post('/api/volunteers', checkRole(['Pastor', 'Coordenadora', 'Supervisora']) as any, async (req, res) => {
    try {
        await dbService.addVolunteer(req.body);
        res.status(201).json({ message: 'Volunteer created' });
    } catch (error) {
        console.error("Error adding volunteer:", error);
        res.status(500).json({ error: "Failed to create volunteer" });
    }
});

app.put('/api/volunteers/:id', checkRole(['Pastor', 'Coordenadora', 'Supervisora']) as any, async (req, res) => {
    try {
        const { id } = req.params;
        await dbService.updateVolunteer(id, req.body);
        res.status(200).json({ message: 'Volunteer updated' });
    } catch (error) {
        console.error("Error updating volunteer:", error);
        res.status(500).json({ error: "Failed to update volunteer" });
    }
});

app.delete('/api/volunteers/:id', checkRole(['Pastor', 'Coordenadora', 'Supervisora']) as any, async (req, res) => {
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
app.post('/api/schedule', checkRole(['Pastor', 'Coordenadora']) as any, async (req, res) => {
    try {
        await dbService.addSchedule(req.body);
        res.status(201).json({ message: 'Schedule created' });
    } catch (error) {
        console.error("Error adding schedule:", error);
        res.status(500).json({ error: "Failed to create schedule" });
    }
});

app.put('/api/schedule/:id', checkRole(['Pastor', 'Coordenadora', 'Supervisora']) as any, async (req, res) => {
    try {
        const { id } = req.params;
        await dbService.updateSchedule(id, req.body);
        res.status(200).json({ message: 'Schedule updated' });
    } catch (error) {
        console.error("Error updating schedule:", error);
        res.status(500).json({ error: "Failed to update schedule" });
    }
});

app.delete('/api/schedule/:id', checkRole(['Pastor', 'Coordenadora']) as any, async (req, res) => {
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
app.post('/api/save-all', checkRole(['Pastor', 'Coordenadora']) as any, async (req, res) => {
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
app.post('/api/seed', checkRole(['Pastor']) as any, async (req, res) => {
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

// Get List of Available Lesson Files
app.get('/api/available-lessons', checkRole(['Pastor', 'Coordenadora', 'Supervisora', 'Ministra']) as any, async (req, res) => {
    try {
        const dataPathCapitalized = path.join(process.cwd(), 'data', 'Topics');
        const dataPathLowercase = path.join(process.cwd(), 'data', 'topics');
        
                const files: { fileName: string; sizeBytes: number; folder: string; createdAt?: string }[] = [];
        
        const scanDir = (dirPath: string, folderName: string) => {
            if (fs.existsSync(dirPath)) {
                const list = fs.readdirSync(dirPath);
                for (const f of list) {
                    if (f.toLowerCase().endsWith('.docx')) {
                        const stat = fs.statSync(path.join(dirPath, f));
                        // Prevent duplicates
                        if (!files.some(existing => existing.fileName === f)) {
                            files.push({
                                fileName: f,
                                sizeBytes: stat.size,
                                folder: folderName,
                                createdAt: stat.mtime.toISOString()
                            });
                        }
                    }
                }
            }
        };
        
        scanDir(dataPathCapitalized, 'Topics');
        scanDir(dataPathLowercase, 'topics');

        // Fetch files stored in PostgreSQL
        try {
            const dbFiles = await dbService.listLessonFiles();
            for (const dbFile of dbFiles) {
                if (!files.some(existing => existing.fileName === dbFile.fileName)) {
                    files.push(dbFile);
                }
            }
        } catch (dbErr) {
            console.error('[AVAILABLE LESSONS] Error reading from database:', dbErr);
        }
        
        const MONTHS_PT = [
          'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
          'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
        ];
        
        const formatted = files.map(f => {
            const regex = /^AULA\s+(\d+)\s+([A-ZÇÁÉÍÓÚÂÊÔÕÃ]+)\s+(\d{4})\s*-\s*(.+)\.docx$/i;
            const match = f.fileName.match(regex);
            
            let dateStr = '';
            let className = '';
            let parsedCorrectly = false;
            
            if (match) {
                const sundayNum = parseInt(match[1], 10);
                const monthName = match[2].toUpperCase();
                const year = parseInt(match[3], 10);
                className = match[4].trim();
                
                const monthIndex = MONTHS_PT.indexOf(monthName);
                if (monthIndex !== -1) {
                    // Find Sundays in that month
                    const sundays: string[] = [];
                    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
                    for (let day = 1; day <= daysInMonth; day++) {
                        const d = new Date(year, monthIndex, day);
                        if (d.getDay() === 0) {
                            const yyyy = year;
                            const mm = String(monthIndex + 1).padStart(2, '0');
                            const dd = String(day).padStart(2, '0');
                            sundays.push(`${yyyy}-${mm}-${dd}`);
                        }
                    }
                    if (sundayNum >= 1 && sundayNum <= sundays.length) {
                        dateStr = sundays[sundayNum - 1];
                        parsedCorrectly = true;
                    }
                }
            }
            
            return {
                fileName: f.fileName,
                sizeBytes: f.sizeBytes,
                className: className || 'Outros',
                date: dateStr,
                parsed: parsedCorrectly,
                createdAt: f.createdAt || new Date().toISOString()
            };
        });
        
        res.status(200).json({ lessons: formatted });
    } catch (error) {
        console.error('[AVAILABLE LESSONS] Error reading directory:', error);
        res.status(500).json({ error: 'Failed to retrieve available lessons' });
    }
});

// Token generation endpoint for Vercel Blob client-side uploads
app.post('/api/upload-lesson/get-token', checkRole(['Pastor']) as any, async (req, res) => {
    try {
        const { pathname } = req.body;
        if (!pathname) {
            return res.status(400).json({ error: 'Missing pathname' });
        }

        const token = process.env.BLOB_READ_WRITE_TOKEN;
        if (!token) {
            console.error('[BLOB TOKEN] BLOB_READ_WRITE_TOKEN is not set');
            return res.status(500).json({ error: 'Blob storage not configured' });
        }

        console.log(`[BLOB TOKEN] Generating client token for: ${pathname}`);

        const clientToken = await generateClientTokenFromReadWriteToken({
            token,
            pathname,
        });

        console.log(`[BLOB TOKEN] Client token generated successfully for: ${pathname}`);
        res.status(200).json({ clientToken });
    } catch (error) {
        console.error('[BLOB TOKEN ERROR]', error);
        const errMessage = error instanceof Error ? error.message : String(error);
        res.status(500).json({ error: `Failed to generate upload token: ${errMessage}` });
    }
});

// Register uploaded Vercel Blob metadata and associate it with a Topic
app.post('/api/upload-lesson/register', checkRole(['Pastor']) as any, async (req, res) => {
    try {
        const { fileName, url, sizeBytes, date, title, description } = req.body;
        if (!fileName || !url) {
            return res.status(400).json({ error: 'Missing fileName or url' });
        }

        // Save blob url info to Database
        await dbService.saveLessonBlobUrl(fileName, url, Number(sizeBytes || 0));
        console.log(`[UPLOAD REGISTRATION] Registered Vercel Blob: ${fileName} -> ${url}`);

        // Auto topic creation in DB
        if (date) {
            const allData = await dbService.getAllData();
            const exists = allData.topics.some((t: any) => t.date === date);
            if (!exists) {
                const finalTitle = title ? String(title) : `Aula - ${String(fileName).replace('.docx', '')}`;
                const finalDesc = description ? String(description) : `Arquivo de aula enviado pelo Pastor.`;
                await dbService.addTopic(date, finalTitle, finalDesc);
                console.log(`[UPLOAD REGISTRATION] Created new topic in DB for date: ${date}`);
            }
        }

        res.status(200).json({ success: true, message: 'Lesson registered successfully' });
    } catch (error) {
        console.error('[UPLOAD REGISTRATION ERROR]', error);
        res.status(500).json({ error: 'Failed to register lesson' });
    }
});

// Upload a Lesson File
app.post('/api/upload-lesson', checkRole(['Pastor']) as any, async (req, res) => {
    try {
        const { fileName, fileContent, date, title, description } = req.body;
        if (!fileName || !fileContent) {
            return res.status(400).json({ error: 'Missing fileName or fileContent' });
        }

        // Calculate size in bytes
        const sizeBytes = Math.round((String(fileContent).length * 3) / 4);

        // 1. Save persistently to PostgreSQL
        await dbService.saveLessonFile(String(fileName), String(fileContent), sizeBytes);
        console.log(`[UPLOAD] File saved to database: ${fileName}`);
        
        // 2. Try saving to local file system as a fallback (succeeds locally, will fail on Vercel)
        try {
            const dataPath = path.join(process.cwd(), 'data', 'Topics');
            if (!fs.existsSync(dataPath)) {
                fs.mkdirSync(dataPath, { recursive: true });
            }
            
            const filePath = path.join(dataPath, String(fileName));
            const buffer = Buffer.from(String(fileContent), 'base64');
            fs.writeFileSync(filePath, buffer);
            console.log(`[UPLOAD] File saved locally: ${filePath}`);
        } catch (fsErr) {
            console.warn('[UPLOAD] Local file system write skipped (possibly Vercel read-only FS):', fsErr);
        }
        
        // Auto topic creation in DB
        if (date) {
            const allData = await dbService.getAllData();
            const exists = allData.topics.some((t: any) => t.date === date);
            if (!exists) {
                const finalTitle = title ? String(title) : `Aula - ${String(fileName).replace('.docx', '')}`;
                const finalDesc = description ? String(description) : `Arquivo de aula enviado pelo Pastor.`;
                await dbService.addTopic(date, finalTitle, finalDesc);
                console.log(`[UPLOAD] Created new topic in DB for date: ${date}`);
            }
        }
        
        res.status(200).json({ success: true, message: 'Upload completed successfully' });
    } catch (error) {
        console.error('[UPLOAD] Error saving file:', error);
        res.status(500).json({ error: 'Failed to upload lesson' });
    }
});

// Standalone Server Support
if (typeof require !== 'undefined' && require.main === module) {
    const port = process.env.PORT || 3000;
    const server = app.listen(port, () => {
        console.log(`API Server running on port ${port}`);
    });
    server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`\n❌ [PORT CONFLICT] A porta ${port} já está sendo usada por outro processo.`);
            console.error(`👉 Rode: npx kill-port ${port} para liberar a porta e inicie o servidor novamente.\n`);
        } else {
            console.error('Server error:', err);
        }
    });
} else if (process.env.NODE_ENV !== 'production') {
    // Fallback for local testing if ESM
    const port = process.env.PORT || 3000;
    if (typeof process !== 'undefined' && process.argv[1] && process.argv[1].includes('index.ts')) {
        const server = app.listen(port, () => {
            console.log(`API Server running on port ${port}`);
        });
        server.on('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`\n❌ [PORT CONFLICT] A porta ${port} já está sendo usada por outro processo.`);
                console.error(`👉 Rode: npx kill-port ${port} para liberar a porta e inicie o servidor novamente.\n`);
            } else {
                console.error('Server error:', err);
            }
        });
    }
}

// Error handler for Clerk auth errors and other unhandled errors
app.use((err: any, req: any, res: any, next: any) => {
    if (err.message && err.message.includes('Unauthenticated')) {
        return res.status(401).json({ error: 'Unauthenticated' });
    }
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

export default app;
if (typeof module !== 'undefined') {
    module.exports = app;
}