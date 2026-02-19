import db from './database';
import { DataPayload } from './googleSheetsService'; // Reusing interface for now, or can redefine

// Helper to get current timestamp
const getTimestamp = () => new Date().toISOString();

export const sqliteService = {
    // Ler todos os dados e formatar para o frontend
    async getAllData(): Promise<DataPayload> {
        const students = db.prepare('SELECT * FROM students').all();
        const attendance = db.prepare('SELECT * FROM attendance').all();
        const volunteers = db.prepare('SELECT * FROM volunteers').all();
        const schedule = db.prepare('SELECT * FROM schedule').all();
        const topics = db.prepare('SELECT * FROM topics').all();

        // Transform data to match frontend expectations
        const formattedStudents = students.map((s: any) => ({
            ...s,
            id: String(s.id),
            age: s.age ? Number(s.age) : 0,
            // Nest attendance
            attendance: attendance
                .filter((a: any) => String(a.student_id) === String(s.id))
                .map((a: any) => ({
                    date: a.date,
                    present: a.present === 1,
                    day: a.day,
                    dismissedBy: a.dismissed_by
                }))
        }));

        const formattedVolunteers = volunteers.map((v: any) => ({
            ...v,
            id: String(v.id)
        }));

        const formattedSchedule = schedule.map((s: any) => ({
            ...s,
            id: String(s.id),
            ministerIds: s.ministerIds ? s.ministerIds.split(',') : []
        }));

        const formattedTopics = topics.map((t: any) => ({
            ...t,
            id: String(t.id)
        }));

        return {
            students: formattedStudents,
            volunteers: formattedVolunteers,
            schedule: formattedSchedule,
            topics: formattedTopics
        };
    },

    // Adicionar Aluno
    async addStudent(student: any) {
        const stmt = db.prepare(`
        INSERT INTO students (id, name, class, age, motherName, phone, type, birthday, created_at, updated_at)
        VALUES (@id, @name, @class, @age, @motherName, @phone, @type, @birthday, @created_at, @updated_at)
    `);

        stmt.run({
            ...student,
            id: String(student.id),
            created_at: getTimestamp(),
            updated_at: getTimestamp()
        });
    },

    // Atualizar Aluno (PUT)
    async updateStudent(id: string, data: any) {
        const stmt = db.prepare(`
        UPDATE students
        SET name = @name, class = @class, age = @age, motherName = @motherName, 
            phone = @phone, type = @type, birthday = @birthday, updated_at = @updated_at
        WHERE id = @id
    `);

        const result = stmt.run({
            ...data,
            id: String(id),
            updated_at: getTimestamp()
        });

        if (result.changes === 0) throw new Error("Student not found");
    },

    // Deletar Aluno
    async deleteStudent(id: string) {
        const stmt = db.prepare('DELETE FROM students WHERE id = ?');
        const result = stmt.run(String(id));
        if (result.changes === 0) throw new Error("Student not found");
    },

    // Marcar/Atualizar Presença
    async updateAttendance(studentId: string, date: string, present: boolean, day: string) {
        // Check if exists
        const existing = db.prepare('SELECT id FROM attendance WHERE student_id = ? AND date = ?').get(studentId, date);

        if (existing) {
            // Update
            const stmt = db.prepare(`
            UPDATE attendance 
            SET present = @present, day = @day, dismissed_by = @dismissedBy
            WHERE student_id = @studentId AND date = @date
        `);

            stmt.run({
                studentId,
                date,
                present: present ? 1 : 0,
                day,
                dismissedBy: present ? undefined : null // Clear dismissal if not present? Logic from sheets: if !present, clear dismissedBy
            });

            if (!present) {
                db.prepare('UPDATE attendance SET dismissed_by = NULL WHERE student_id = ? AND date = ?').run(studentId, date);
            }

        } else {
            // Insert
            if (present) {
                const stmt = db.prepare(`
                INSERT INTO attendance (id, student_id, date, present, day, dismissed_by, created_at)
                VALUES (@id, @studentId, @date, @present, @day, NULL, @created_at)
            `);

                stmt.run({
                    id: String(Date.now()), // Generate ID
                    studentId,
                    date,
                    present: 1,
                    day,
                    created_at: getTimestamp()
                });
            }
        }
    },

    // Registrar Saída
    async updateDismissal(studentId: string, date: string, responsibleName: string) {
        const stmt = db.prepare(`
        UPDATE attendance 
        SET dismissed_by = ? 
        WHERE student_id = ? AND date = ?
    `);

        const result = stmt.run(responsibleName, studentId, date);
        if (result.changes === 0) throw new Error("Attendance record not found to dismiss");
    },

    // Adicionar Tópico
    async addTopic(date: string, title: string, description: string) {
        const stmt = db.prepare(`
        INSERT INTO topics (id, date, title, description, created_at)
        VALUES (@id, @date, @title, @description, @created_at)
    `);

        stmt.run({
            id: String(Date.now()),
            date,
            title,
            description,
            created_at: getTimestamp()
        });
    },

    // Popular Banco de Dados (Seed/Overwrite)
    async seedDatabase(data: any) {
        const deleteStudents = db.prepare('DELETE FROM students');
        const deleteAttendance = db.prepare('DELETE FROM attendance');
        const deleteVolunteers = db.prepare('DELETE FROM volunteers');
        const deleteSchedule = db.prepare('DELETE FROM schedule');
        const deleteTopics = db.prepare('DELETE FROM topics');

        const insertStudent = db.prepare(`
        INSERT INTO students (id, name, class, age, motherName, phone, type, birthday, created_at, updated_at)
        VALUES (@id, @name, @class, @age, @motherName, @phone, @type, @birthday, @created_at, @updated_at)
    `);

        const insertAttendance = db.prepare(`
        INSERT INTO attendance (id, student_id, date, present, day, dismissed_by, created_at)
        VALUES (@id, @studentId, @date, @present, @day, @dismissedBy, @created_at)
    `);

        const insertVolunteer = db.prepare(`
        INSERT INTO volunteers (id, name, created_at)
        VALUES (@id, @name, @created_at)
    `);

        const insertSchedule = db.prepare(`
        INSERT INTO schedule (id, date, className, supervisorId, deskId, coordinatorId, ministerIds, created_at)
        VALUES (@id, @date, @className, @supervisorId, @deskId, @coordinatorId, @ministerIds, @created_at)
    `);

        const insertTopic = db.prepare(`
        INSERT INTO topics (id, date, title, description, created_at)
        VALUES (@id, @date, @title, @description, @created_at)
    `);

        const transaction = db.transaction((payload) => {
            deleteAttendance.run(); // Foreign key constraint, delete children first? Or rely on CASCADE
            deleteStudents.run();
            deleteVolunteers.run();
            deleteSchedule.run();
            deleteTopics.run();

            // 1. Students & Attendance
            for (const s of payload.students) {
                insertStudent.run({
                    id: String(s.id),
                    name: s.name,
                    class: s.class,
                    age: s.age,
                    motherName: s.motherName,
                    phone: s.phone,
                    type: s.type,
                    birthday: s.birthday || "",
                    created_at: getTimestamp(),
                    updated_at: getTimestamp()
                });

                if (s.attendance && Array.isArray(s.attendance)) {
                    for (const a of s.attendance) {
                        const dateObj = new Date(a.date + 'T00:00:00');
                        let dayStr = a.day;
                        if (!dayStr) {
                            const dayIdx = dateObj.getDay();
                            if (dayIdx === 0) dayStr = 'Sunday';
                            else if (dayIdx === 3) dayStr = 'Wednesday';
                            else dayStr = '';
                        }

                        insertAttendance.run({
                            id: Math.random().toString(36).substr(2, 9),
                            studentId: String(s.id),
                            date: a.date,
                            present: a.present ? 1 : 0,
                            day: dayStr,
                            dismissedBy: a.dismissedBy || null,
                            created_at: getTimestamp()
                        });
                    }
                }
            }

            // 2. Volunteers
            for (const v of payload.volunteers) {
                insertVolunteer.run({
                    id: String(v.id),
                    name: v.name,
                    created_at: getTimestamp()
                });
            }

            // 3. Schedule
            for (const s of payload.schedule) {
                insertSchedule.run({
                    id: Math.random().toString(36).substr(2, 9),
                    date: s.date,
                    className: s.className,
                    supervisorId: s.supervisorId,
                    deskId: s.deskId,
                    coordinatorId: s.coordinatorId,
                    ministerIds: Array.isArray(s.ministerIds) ? s.ministerIds.join(',') : s.ministerIds,
                    created_at: getTimestamp()
                });
            }

            // 4. Topics
            for (const t of payload.topics) {
                insertTopic.run({
                    id: Math.random().toString(36).substr(2, 9),
                    date: t.date,
                    title: t.title,
                    description: t.description,
                    created_at: getTimestamp()
                });
            }
        });

        transaction(data);
    }
};
