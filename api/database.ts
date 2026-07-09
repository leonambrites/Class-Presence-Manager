import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const getSql = () => {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL environment variable is missing.");
    }
    return neon(process.env.DATABASE_URL.replace(/^["']|["']$/g, ''));
};

export const initDb = async () => {
    try {
        const sql = getSql();
        // Students Table
        await sql`
            CREATE TABLE IF NOT EXISTS students (
                id VARCHAR(255) PRIMARY KEY,
                name TEXT NOT NULL,
                class TEXT NOT NULL,
                age INTEGER,
                guardianName TEXT,
                phone TEXT,
                type TEXT,
                birthday TEXT,
                has_allergy BOOLEAN DEFAULT FALSE,
                allergy_description TEXT,
                mother_name TEXT,
                father_name TEXT,
                has_other_guardian BOOLEAN DEFAULT FALSE,
                other_guardian_name TEXT,
                other_guardian_relationship TEXT,
                photo TEXT,
                image_use_allowed BOOLEAN DEFAULT FALSE,
                image_use_document TEXT,
                family_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // Migrate existing databases: add new columns if they do not exist
        try {
            await sql`ALTER TABLE students ADD COLUMN IF NOT EXISTS mother_name TEXT`;
            await sql`ALTER TABLE students ADD COLUMN IF NOT EXISTS father_name TEXT`;
            await sql`ALTER TABLE students ADD COLUMN IF NOT EXISTS has_other_guardian BOOLEAN DEFAULT FALSE`;
            await sql`ALTER TABLE students ADD COLUMN IF NOT EXISTS other_guardian_name TEXT`;
            await sql`ALTER TABLE students ADD COLUMN IF NOT EXISTS other_guardian_relationship TEXT`;
            await sql`ALTER TABLE students ADD COLUMN IF NOT EXISTS photo TEXT`;
            await sql`ALTER TABLE students ADD COLUMN IF NOT EXISTS image_use_allowed BOOLEAN DEFAULT FALSE`;
            await sql`ALTER TABLE students ADD COLUMN IF NOT EXISTS image_use_document TEXT`;
            await sql`ALTER TABLE students ADD COLUMN IF NOT EXISTS family_id TEXT`;
        } catch (err) {
            console.error("Migration error adding family_id and other columns to students table:", err);
        }

        // Attendance Table
        await sql`
            CREATE TABLE IF NOT EXISTS attendance (
                id VARCHAR(255) PRIMARY KEY,
                student_id VARCHAR(255) NOT NULL,
                date TEXT NOT NULL,
                present BOOLEAN DEFAULT FALSE,
                day TEXT,
                dismissed_by TEXT,
                daily_code INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
            )
        `;

        // Volunteers Table
        await sql`
            CREATE TABLE IF NOT EXISTS volunteers (
                id VARCHAR(255) PRIMARY KEY,
                name TEXT NOT NULL,
                class TEXT,
                phone TEXT,
                type TEXT,
                team TEXT,
                photo TEXT,
                email TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // Migration for existing Volunteers table
        try {
            await sql`ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS class TEXT`;
            await sql`ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS phone TEXT`;
            await sql`ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS type TEXT`;
            await sql`ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS team TEXT`;
            await sql`ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS photo TEXT`;
            await sql`ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS email TEXT`;
        } catch (e) {
            // Columns likely already exist
        }

        // Migration for existing Students table (Allergies and Renames)
        try {
            await sql`ALTER TABLE students RENAME COLUMN mothername TO guardianname`;
        } catch (e) {
            // Column likely already renamed
        }

        try {
            await sql`ALTER TABLE students ADD COLUMN has_allergy BOOLEAN DEFAULT FALSE`;
            await sql`ALTER TABLE students ADD COLUMN allergy_description TEXT`;
        } catch (e) {
            // Columns likely already exist
        }

        // Migration for existing Attendance table
        try {
            await sql`ALTER TABLE attendance ADD COLUMN daily_code INTEGER`;
        } catch (e) {
            // Column likely already exists
        }

        try {
            await sql`ALTER TABLE attendance ADD COLUMN ready_to_leave BOOLEAN DEFAULT FALSE`;
        } catch (e) {
            // Column likely already exists
        }

        try {
            await sql`UPDATE attendance SET daily_code = NULL WHERE present = FALSE`;
        } catch (e) {
            // Clean up query failed
        }

        // Schedule Table
        await sql`
            CREATE TABLE IF NOT EXISTS schedule (
                id VARCHAR(255) PRIMARY KEY,
                date TEXT NOT NULL,
                className TEXT,
                team TEXT,
                supervisorId VARCHAR(255),
                deskId VARCHAR(255),
                coordinatorId VARCHAR(255),
                ministerIds TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        try {
            await sql`ALTER TABLE schedule ADD COLUMN team TEXT`;
        } catch (e) {
            // Column likely already exists
        }

        // Topics Table
        await sql`
            CREATE TABLE IF NOT EXISTS topics (
                id VARCHAR(255) PRIMARY KEY,
                date TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // Lessons Table (for storing uploaded docx files persistently on Vercel)
        await sql`
            CREATE TABLE IF NOT EXISTS lessons (
                filename TEXT PRIMARY KEY,
                filecontent TEXT NOT NULL,
                size_bytes INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        try {
            await sql`ALTER TABLE lessons ADD COLUMN url TEXT`;
        } catch (e) {
            // Column likely already exists
        }

        // Push Subscriptions Table
        await sql`
            CREATE TABLE IF NOT EXISTS push_subscriptions (
                id VARCHAR(255) PRIMARY KEY,
                subscription_json TEXT NOT NULL,
                user_email TEXT,
                user_name TEXT,
                user_role TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // Print Queue Table
        await sql`
            CREATE TABLE IF NOT EXISTS print_queue (
                id VARCHAR(255) PRIMARY KEY,
                student_id VARCHAR(255) NOT NULL,
                student_name TEXT NOT NULL,
                class_name TEXT NOT NULL,
                security_code VARCHAR(50) NOT NULL,
                has_allergy BOOLEAN NOT NULL DEFAULT FALSE,
                allergy_description TEXT NOT NULL DEFAULT '',
                is_birthday BOOLEAN NOT NULL DEFAULT FALSE,
                image_use_allowed BOOLEAN NOT NULL DEFAULT TRUE,
                student_type TEXT NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `;

        try {
            await sql`ALTER TABLE push_subscriptions ADD COLUMN user_email TEXT`;
        } catch (e) {
            // Column likely already exists
        }

        try {
            await sql`ALTER TABLE push_subscriptions ADD COLUMN user_name TEXT`;
        } catch (e) {
            // Column likely already exists
        }

        try {
            await sql`ALTER TABLE push_subscriptions ADD COLUMN user_role TEXT`;
        } catch (e) {
            // Column likely already exists
        }

        // Automatic data migration for family_id grouping
        try {
            const allStudents = await sql`SELECT id, phone, family_id FROM students`;
            const studentsWithoutFamily = allStudents.filter(s => !s.family_id);
            if (studentsWithoutFamily.length > 0) {
                console.log(`Running automatic family_id migration for ${studentsWithoutFamily.length} students...`);
                const groupsByPhone: { [phone: string]: any[] } = {};
                
                studentsWithoutFamily.forEach(s => {
                    const cleanPhone = (s.phone || '').trim().replace(/\D/g, '');
                    const key = cleanPhone || `no_phone_${s.id}`;
                    if (!groupsByPhone[key]) {
                        groupsByPhone[key] = [];
                    }
                    groupsByPhone[key].push(s);
                });

                for (const phoneKey of Object.keys(groupsByPhone)) {
                    const group = groupsByPhone[phoneKey];
                    let existingFamilyId: string | null = null;
                    const cleanPhone = phoneKey.startsWith('no_phone_') ? '' : phoneKey;
                    
                    if (cleanPhone) {
                        const match = allStudents.find(s => s.family_id && (s.phone || '').trim().replace(/\D/g, '') === cleanPhone);
                        if (match) {
                            existingFamilyId = match.family_id;
                        }
                    }
                    
                    const familyId = existingFamilyId || `fam_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    
                    for (const student of group) {
                        await sql`UPDATE students SET family_id = ${familyId} WHERE id = ${student.id}`;
                    }
                }
                console.log("Automatic family_id migration completed successfully.");
            }
        } catch (migrationErr) {
            console.error("Failed executing family_id data migration:", migrationErr);
        }

        console.log("Vercel Postgres Database initialized successfully.");
    } catch (error) {
        console.error("Error initializing Vercel Postgres database:", error);
    }
};
