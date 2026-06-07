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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // Migration for existing Volunteers table
        try {
            await sql`ALTER TABLE volunteers ADD COLUMN class TEXT`;
            await sql`ALTER TABLE volunteers ADD COLUMN phone TEXT`;
            await sql`ALTER TABLE volunteers ADD COLUMN type TEXT`;
            await sql`ALTER TABLE volunteers ADD COLUMN team TEXT`;
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        console.log("Vercel Postgres Database initialized successfully.");
    } catch (error) {
        console.error("Error initializing Vercel Postgres database:", error);
    }
};
