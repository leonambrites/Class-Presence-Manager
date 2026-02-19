import Database from 'better-sqlite3';

const db = new Database('database.sqlite', { verbose: console.log });
db.pragma('journal_mode = WAL');

// Initialize database with tables
const initDb = () => {
    // Students Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS students (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            class TEXT NOT NULL,
            age INTEGER,
            motherName TEXT,
            phone TEXT,
            type TEXT,
            birthday TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Attendance Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS attendance (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL,
            date TEXT NOT NULL,
            present INTEGER DEFAULT 0, -- 0 or 1 for boolean
            day TEXT,
            dismissed_by TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
        )
    `);

    // Volunteers Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS volunteers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Schedule Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS schedule (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            className TEXT,
            supervisorId TEXT,
            deskId TEXT,
            coordinatorId TEXT,
            ministerIds TEXT, -- JSON string or comma separated
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Topics Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS topics (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    console.log("Database initialized successfully.");
};

initDb();

export default db;
