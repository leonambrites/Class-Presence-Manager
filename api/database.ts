import { sql } from '@vercel/postgres';

export const initDb = async () => {
    try {
        // Students Table
        await sql`
            CREATE TABLE IF NOT EXISTS students (
                id VARCHAR(255) PRIMARY KEY,
                name TEXT NOT NULL,
                class TEXT NOT NULL,
                age INTEGER,
                motherName TEXT,
                phone TEXT,
                type TEXT,
                birthday TEXT,
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
            )
        `;

        // Volunteers Table
        await sql`
            CREATE TABLE IF NOT EXISTS volunteers (
                id VARCHAR(255) PRIMARY KEY,
                name TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // Schedule Table
        await sql`
            CREATE TABLE IF NOT EXISTS schedule (
                id VARCHAR(255) PRIMARY KEY,
                date TEXT NOT NULL,
                className TEXT,
                supervisorId VARCHAR(255),
                deskId VARCHAR(255),
                coordinatorId VARCHAR(255),
                ministerIds TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

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

        console.log("Vercel Postgres Database initialized successfully.");
    } catch (error) {
        console.error("Error initializing Vercel Postgres database:", error);
    }
};
