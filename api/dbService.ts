import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const getSql = () => {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL environment variable is missing.");
    }
    return neon(process.env.DATABASE_URL);
};
import { DataPayload } from './googleSheetsService';

const getTimestamp = () => new Date().toISOString();

export const dbService = {
    // Ler todos os dados
    async getAllData(): Promise<DataPayload> {
        const sql = getSql();
        const studentsData = await sql`SELECT * FROM students`;
        const attendanceData = await sql`SELECT * FROM attendance`;
        const volunteersData = await sql`SELECT * FROM volunteers`;
        const scheduleData = await sql`SELECT * FROM schedule`;
        const topicsData = await sql`SELECT * FROM topics`;

        const formattedStudents = studentsData.map((s: any) => ({
            ...s,
            age: s.age ? Number(s.age) : 0,
            attendance: attendanceData
                .filter((a: any) => String(a.student_id) === String(s.id))
                .map((a: any) => ({
                    date: a.date,
                    present: a.present,
                    day: a.day,
                    dismissedBy: a.dismissed_by
                }))
        }));

        const formattedVolunteers = volunteersData.map((v: any) => ({
            ...v,
            id: String(v.id)
        }));

        const formattedSchedule = scheduleData.map((s: any) => ({
            ...s,
            id: String(s.id),
            ministerIds: s.ministerids ? s.ministerids.split(',') : (s.ministerIds ? s.ministerIds.split(',') : [])
        }));

        const formattedTopics = topicsData.map((t: any) => ({
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

    async addStudent(student: any) {
        const sql = getSql();
        await sql`
            INSERT INTO students (id, name, class, age, motherName, phone, type, birthday, created_at, updated_at)
            VALUES (
                ${String(student.id)}, ${student.name}, ${student.class}, ${student.age}, 
                ${student.motherName}, ${student.phone}, ${student.type}, ${student.birthday}, 
                ${getTimestamp()}, ${getTimestamp()}
            )
        `;
    },

    async updateStudent(id: string, data: any) {
        const sql = getSql();
        const result = await sql`
            UPDATE students
            SET name = ${data.name}, class = ${data.class}, age = ${data.age}, motherName = ${data.motherName}, 
                phone = ${data.phone}, type = ${data.type}, birthday = ${data.birthday}, updated_at = ${getTimestamp()}
            WHERE id = ${String(id)}
            RETURNING id
        `;
        if (result.length === 0) throw new Error("Student not found");
    },

    async deleteStudent(id: string) {
        const sql = getSql();
        const result = await sql`DELETE FROM students WHERE id = ${String(id)} RETURNING id`;
        if (result.length === 0) throw new Error("Student not found");
    },

    async updateAttendance(studentId: string, date: string, present: boolean, day: string) {
        const sql = getSql();
        const existing = await sql`SELECT id FROM attendance WHERE student_id = ${studentId} AND date = ${date}`;

        if (existing.length > 0) {
            await sql`
                UPDATE attendance 
                SET present = ${present}, day = ${day}, dismissed_by = ${present ? null : undefined}
                WHERE student_id = ${studentId} AND date = ${date}
            `;
            if (!present) {
                await sql`UPDATE attendance SET dismissed_by = NULL WHERE student_id = ${studentId} AND date = ${date}`;
            }
        } else {
            if (present) {
                await sql`
                    INSERT INTO attendance (id, student_id, date, present, day, dismissed_by, created_at)
                    VALUES (${String(Date.now())}, ${studentId}, ${date}, ${present}, ${day}, NULL, ${getTimestamp()})
                `;
            }
        }
    },

    async updateDismissal(studentId: string, date: string, responsibleName: string) {
        const sql = getSql();
        const result = await sql`
            UPDATE attendance 
            SET dismissed_by = ${responsibleName}
            WHERE student_id = ${studentId} AND date = ${date}
            RETURNING id
        `;
        if (result.length === 0) throw new Error("Attendance record not found to dismiss");
    },

    async addTopic(date: string, title: string, description: string) {
        const sql = getSql();
        await sql`
            INSERT INTO topics (id, date, title, description, created_at)
            VALUES (${String(Date.now())}, ${date}, ${title}, ${description}, ${getTimestamp()})
        `;
    },

    async addVolunteer(name: string) {
        const sql = getSql();
        await sql`
            INSERT INTO volunteers (id, name, created_at)
            VALUES (${String(Date.now())}, ${name}, ${getTimestamp()})
        `;
    },

    async updateVolunteer(id: string, name: string) {
        const sql = getSql();
        const result = await sql`
            UPDATE volunteers SET name = ${name} WHERE id = ${String(id)}
            RETURNING id
        `;
        if (result.length === 0) throw new Error("Volunteer not found");
    },

    async deleteVolunteer(id: string) {
        const sql = getSql();
        const result = await sql`DELETE FROM volunteers WHERE id = ${String(id)} RETURNING id`;
        if (result.length === 0) throw new Error("Volunteer not found");
    },

    async addSchedule(schedule: any) {
        const sql = getSql();
        const ministerIdsStr = Array.isArray(schedule.ministerIds) ? schedule.ministerIds.join(',') : schedule.ministerIds;
        await sql`
            INSERT INTO schedule (id, date, className, supervisorId, deskId, coordinatorId, ministerIds, created_at)
            VALUES (
                ${String(Date.now())}, ${schedule.date}, ${schedule.className}, ${schedule.supervisorId}, 
                ${schedule.deskId}, ${schedule.coordinatorId}, ${ministerIdsStr}, ${getTimestamp()}
            )
        `;
    },

    async updateSchedule(id: string, schedule: any) {
        const sql = getSql();
        const ministerIdsStr = Array.isArray(schedule.ministerIds) ? schedule.ministerIds.join(',') : schedule.ministerIds;
        const result = await sql`
            UPDATE schedule
            SET date = ${schedule.date}, className = ${schedule.className}, supervisorId = ${schedule.supervisorId}, 
                deskId = ${schedule.deskId}, coordinatorId = ${schedule.coordinatorId}, ministerIds = ${ministerIdsStr}
            WHERE id = ${String(id)}
            RETURNING id
        `;
        if (result.length === 0) throw new Error("Schedule not found");
    },

    async deleteSchedule(id: string) {
        const sql = getSql();
        const result = await sql`DELETE FROM schedule WHERE id = ${String(id)} RETURNING id`;
        if (result.length === 0) throw new Error("Schedule not found");
    },

    async seedDatabase(payload: any) {
        const sql = getSql();
        try {
            await sql`DELETE FROM attendance`;
            await sql`DELETE FROM students`;
            await sql`DELETE FROM volunteers`;
            await sql`DELETE FROM schedule`;
            await sql`DELETE FROM topics`;

            for (const s of payload.students) {
                await sql`
                    INSERT INTO students (id, name, class, age, motherName, phone, type, birthday, created_at, updated_at)
                    VALUES (
                        ${String(s.id)}, ${s.name}, ${s.class}, ${s.age}, ${s.motherName}, ${s.phone}, 
                        ${s.type}, ${s.birthday || ""}, ${getTimestamp()}, ${getTimestamp()}
                    )
                `;

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

                        await sql`
                            INSERT INTO attendance (id, student_id, date, present, day, dismissed_by, created_at)
                            VALUES (
                                ${Math.random().toString(36).substr(2, 9)}, ${String(s.id)}, ${a.date}, 
                                ${a.present}, ${dayStr}, ${a.dismissedBy || null}, ${getTimestamp()}
                            )
                        `;
                    }
                }
            }

            for (const v of payload.volunteers) {
                await sql`
                    INSERT INTO volunteers (id, name, created_at)
                    VALUES (${String(v.id || Date.now())}, ${v.name}, ${getTimestamp()})
                `;
            }

            for (const sch of payload.schedule) {
                const ministerIdsStr = Array.isArray(sch.ministerIds) ? sch.ministerIds.join(',') : sch.ministerIds;
                await sql`
                    INSERT INTO schedule (id, date, className, supervisorId, deskId, coordinatorId, ministerIds, created_at)
                    VALUES (
                        ${String(sch.id || Date.now())}, ${sch.date}, ${sch.className}, ${sch.supervisorId}, 
                        ${sch.deskId}, ${sch.coordinatorId}, ${ministerIdsStr}, ${getTimestamp()}
                    )
                `;
            }

            for (const t of payload.topics) {
                await sql`
                    INSERT INTO topics (id, date, title, description, created_at)
                    VALUES (${String(t.id || Date.now())}, ${t.date}, ${t.title}, ${t.description}, ${getTimestamp()})
                `;
            }
        } catch (error) {
            console.error("Seed transaction failed:", error);
            throw error;
        }
    }
};
