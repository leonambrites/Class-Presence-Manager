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
            guardianName: s.guardianname || s.guardianName || s.mothername || s.motherName || '',
            age: s.age ? Number(s.age) : 0,
            hasAllergy: s.has_allergy,
            allergyDescription: s.allergy_description || '',
            attendance: attendanceData
                .filter((a: any) => String(a.student_id) === String(s.id))
                .map((a: any) => ({
                    date: a.date,
                    present: a.present,
                    day: a.day,
                    dismissedBy: a.dismissed_by,
                    dailyCode: a.daily_code ? Number(a.daily_code) : undefined,
                    readyToLeave: a.ready_to_leave || false
                }))
        }));

        const formattedVolunteers = volunteersData.map((v: any) => ({
            ...v,
            id: String(v.id),
            class: v.class || '',
            phone: v.phone || '',
            type: v.type || '',
            team: v.team || ''
        }));

        const formattedSchedule = scheduleData.map((s: any) => ({
            ...s,
            id: String(s.id),
            className: s.classname || s.className || '',
            team: s.team || '',
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
            INSERT INTO students (id, name, class, age, guardianName, phone, type, birthday, has_allergy, allergy_description, created_at, updated_at)
            VALUES (
                ${String(student.id)}, ${student.name}, ${student.class}, ${student.age}, 
                ${student.guardianName}, ${student.phone}, ${student.type}, ${student.birthday}, 
                ${student.hasAllergy || false}, ${student.allergyDescription || ''},
                ${getTimestamp()}, ${getTimestamp()}
            )
        `;
    },

    async updateStudent(id: string, data: any) {
        const sql = getSql();
        const result = await sql`
            UPDATE students
            SET name = ${data.name}, class = ${data.class}, age = ${data.age}, guardianName = ${data.guardianName}, 
                phone = ${data.phone}, type = ${data.type}, birthday = ${data.birthday}, 
                has_allergy = ${data.hasAllergy || false}, allergy_description = ${data.allergyDescription || ''}, 
                updated_at = ${getTimestamp()}
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

    async updateAttendance(studentId: string, date: string, present: boolean, day: string, dailyCode?: number) {
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
                    INSERT INTO attendance (id, student_id, date, present, day, dismissed_by, daily_code, created_at)
                    VALUES (${String(Date.now())}, ${studentId}, ${date}, ${present}, ${day}, NULL, ${dailyCode || null}, ${getTimestamp()})
                `;
            }
        }
    },

    async updateDismissal(studentId: string, date: string, responsibleName: string) {
        const sql = getSql();
        const result = await sql`
            UPDATE attendance 
            SET dismissed_by = ${responsibleName}, ready_to_leave = FALSE
            WHERE student_id = ${studentId} AND date = ${date}
            RETURNING id
        `;
        if (result.length === 0) throw new Error("Attendance record not found to dismiss");
    },

    async resetDismissal(studentId: string, date: string) {
        const sql = getSql();
        const result = await sql`
            UPDATE attendance 
            SET dismissed_by = NULL, ready_to_leave = FALSE
            WHERE student_id = ${studentId} AND date = ${date}
            RETURNING id
        `;
        if (result.length === 0) throw new Error("Attendance record not found to reset dismissal");
    },

    async updateReadyToLeave(studentId: string, date: string, readyToLeave: boolean) {
        const sql = getSql();
        const result = await sql`
            UPDATE attendance
            SET ready_to_leave = ${readyToLeave}
            WHERE student_id = ${studentId} AND date = ${date}
            RETURNING id
        `;
        if (result.length === 0) throw new Error("Attendance record not found to update ready to leave status");
    },

    async addTopic(date: string, title: string, description: string, id?: string) {
        const sql = getSql();
        const finalId = id || String(Date.now() + Math.floor(Math.random() * 1000));
        await sql`
            INSERT INTO topics (id, date, title, description, created_at)
            VALUES (${String(finalId)}, ${date}, ${title}, ${description}, ${getTimestamp()})
        `;
    },

    async updateTopic(id: string, date: string, title: string, description: string) {
        const sql = getSql();
        const result = await sql`
            UPDATE topics 
            SET date = ${date}, title = ${title}, description = ${description}
            WHERE id = ${String(id)}
            RETURNING id
        `;
        if (result.length === 0) throw new Error("Topic not found");
    },

    async deleteTopic(id: string) {
        const sql = getSql();
        const result = await sql`DELETE FROM topics WHERE id = ${String(id)} RETURNING id`;
        if (result.length === 0) throw new Error("Topic not found");
    },

    async addVolunteer(volunteer: any) {
        const sql = getSql();
        await sql`
            INSERT INTO volunteers (id, name, class, phone, type, team, created_at)
            VALUES (${String(Date.now())}, ${volunteer.name}, ${volunteer.class || ''}, ${volunteer.phone || ''}, ${volunteer.type || ''}, ${volunteer.team || ''}, ${getTimestamp()})
        `;
    },

    async updateVolunteer(id: string, volunteer: any) {
        const sql = getSql();
        const result = await sql`
            UPDATE volunteers SET name = ${volunteer.name}, class = ${volunteer.class || ''}, phone = ${volunteer.phone || ''}, type = ${volunteer.type || ''}, team = ${volunteer.team || ''} WHERE id = ${String(id)}
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
        const ministerIdsStr = Array.isArray(schedule.ministerIds) ? schedule.ministerIds.join(',') : (schedule.ministerIds || '');
        await sql`
            INSERT INTO schedule (id, date, className, team, supervisorId, deskId, coordinatorId, ministerIds, created_at)
            VALUES (
                ${String(Date.now())}, ${schedule.date}, ${schedule.className}, ${schedule.team || ''}, ${schedule.supervisorId || null}, 
                ${schedule.deskId || null}, ${schedule.coordinatorId || null}, ${ministerIdsStr}, ${getTimestamp()}
            )
        `;
    },

    async updateSchedule(id: string, schedule: any) {
        const sql = getSql();
        const ministerIdsStr = Array.isArray(schedule.ministerIds) ? schedule.ministerIds.join(',') : (schedule.ministerIds || '');
        const result = await sql`
            UPDATE schedule
            SET date = ${schedule.date}, className = ${schedule.className}, team = ${schedule.team || ''}, supervisorId = ${schedule.supervisorId || null}, 
                deskId = ${schedule.deskId || null}, coordinatorId = ${schedule.coordinatorId || null}, ministerIds = ${ministerIdsStr}
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
                    INSERT INTO students (id, name, class, age, guardianName, phone, type, birthday, created_at, updated_at)
                    VALUES (
                        ${String(s.id)}, ${s.name}, ${s.class}, ${s.age}, ${s.guardianName}, ${s.phone}, 
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
                    INSERT INTO volunteers (id, name, class, phone, type, team, created_at)
                    VALUES (${String(v.id || Date.now())}, ${v.name}, ${v.class || ''}, ${v.phone || ''}, ${v.type || ''}, ${v.team || ''}, ${getTimestamp()})
                `;
            }

            for (const sch of payload.schedule) {
                const ministerIdsStr = Array.isArray(sch.ministerIds) ? sch.ministerIds.join(',') : (sch.ministerIds || '');
                await sql`
                    INSERT INTO schedule (id, date, className, team, supervisorId, deskId, coordinatorId, ministerIds, created_at)
                    VALUES (
                        ${String(sch.id || Date.now())}, ${sch.date}, ${sch.className}, ${sch.team || ''}, ${sch.supervisorId || null}, 
                        ${sch.deskId || null}, ${sch.coordinatorId || null}, ${ministerIdsStr}, ${getTimestamp()}
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
    },

    async saveLessonFile(filename: string, filecontent: string, sizeBytes: number) {
        const sql = getSql();
        await sql`
            INSERT INTO lessons (filename, filecontent, size_bytes, created_at)
            VALUES (${filename}, ${filecontent}, ${sizeBytes}, ${getTimestamp()})
            ON CONFLICT (filename) 
            DO UPDATE SET filecontent = EXCLUDED.filecontent, size_bytes = EXCLUDED.size_bytes, created_at = EXCLUDED.created_at
        `;
    },

    async saveLessonBlobUrl(filename: string, url: string, sizeBytes: number) {
        const sql = getSql();
        await sql`
            INSERT INTO lessons (filename, url, filecontent, size_bytes, created_at)
            VALUES (${filename}, ${url}, '', ${sizeBytes}, ${getTimestamp()})
            ON CONFLICT (filename) 
            DO UPDATE SET url = EXCLUDED.url, size_bytes = EXCLUDED.size_bytes, created_at = EXCLUDED.created_at
        `;
    },

    async getLessonFile(filename: string) {
        const sql = getSql();
        const result = await sql`SELECT filecontent, url FROM lessons WHERE filename = ${filename}`;
        return result.length > 0 ? result[0] : null;
    },

    async listLessonFiles() {
        const sql = getSql();
        const result = await sql`SELECT filename, size_bytes, url, created_at FROM lessons`;
        return result.map((r: any) => ({
            fileName: r.filename,
            sizeBytes: Number(r.size_bytes || 0),
            folder: r.url ? 'Vercel Blob' : 'Database',
            createdAt: r.created_at
        }));
    }
};
