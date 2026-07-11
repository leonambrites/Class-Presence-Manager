import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const getSql = () => {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL environment variable is missing.");
    }
    return neon(process.env.DATABASE_URL.replace(/^["']|["']$/g, ''));
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

        const formattedStudents = studentsData.map((s: any) => {
            const hasOtherGuardian = s.has_other_guardian || false;
            const otherName = s.other_guardian_name || '';
            const motherName = s.mother_name || s.mothername || '';
            const fatherName = s.father_name || s.fathername || '';
            
            // Calculate guardianName for legacy compatibility
            let guardianName = s.guardianname || s.guardianName || '';
            if (!guardianName) {
                if (hasOtherGuardian && otherName) {
                    guardianName = `${otherName} (${s.other_guardian_relationship || 'Responsável'})`;
                } else if (motherName) {
                    guardianName = motherName;
                } else if (fatherName) {
                    guardianName = fatherName;
                }
            }

            return {
                ...s,
                guardianName,
                motherName,
                fatherName,
                hasOtherGuardian,
                otherGuardianName: otherName,
                otherGuardianRelationship: s.other_guardian_relationship || '',
                age: s.age ? Number(s.age) : 0,
                hasAllergy: s.has_allergy,
                allergyDescription: s.allergy_description || '',
                photo: s.photo || '',
                imageUseAllowed: s.image_use_allowed || false,
                imageUseDocument: s.image_use_document || '',
                familyId: s.family_id || '',
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
            };
        });

        const formattedVolunteers = volunteersData.map((v: any) => ({
            ...v,
            id: String(v.id),
            class: v.class || '',
            phone: v.phone || '',
            type: v.type || '',
            team: v.team || '',
            photo: v.photo || '',
            email: v.email || ''
        }));

        const formattedSchedule = scheduleData.map((s: any) => ({
            ...s,
            id: String(s.id),
            className: s.classname || s.className || '',
            team: s.team || '',
            supervisorId: s.supervisorid || s.supervisorId || null,
            deskId: s.deskid || s.deskId || null,
            coordinatorId: s.coordinatorid || s.coordinatorId || null,
            escadaId: s.escadaid || s.escadaId || null,
            corredorId: s.corredorid || s.corredorId || null,
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
            INSERT INTO students (id, name, class, age, guardianName, phone, type, birthday, has_allergy, allergy_description, mother_name, father_name, has_other_guardian, other_guardian_name, other_guardian_relationship, photo, image_use_allowed, image_use_document, family_id, created_at, updated_at)
            VALUES (
                ${String(student.id)}, ${student.name}, ${student.class}, ${student.age}, 
                ${student.guardianName || ''}, ${student.phone}, ${student.type}, ${student.birthday}, 
                ${student.hasAllergy || false}, ${student.allergyDescription || ''},
                ${student.motherName || ''}, ${student.fatherName || ''},
                ${student.hasOtherGuardian || false}, ${student.otherGuardianName || ''},
                ${student.otherGuardianRelationship || ''},
                ${student.photo || ''},
                ${student.imageUseAllowed || false}, ${student.imageUseDocument || ''},
                ${student.familyId || ''},
                ${getTimestamp()}, ${getTimestamp()}
            )
        `;
    },

    async updateStudent(id: string, data: any) {
        const sql = getSql();
        const result = await sql`
            UPDATE students
            SET name = ${data.name}, class = ${data.class}, age = ${data.age}, guardianName = ${data.guardianName || ''}, 
                phone = ${data.phone}, type = ${data.type}, birthday = ${data.birthday}, 
                has_allergy = ${data.hasAllergy || false}, allergy_description = ${data.allergyDescription || ''}, 
                mother_name = ${data.motherName || ''}, father_name = ${data.fatherName || ''},
                has_other_guardian = ${data.hasOtherGuardian || false}, other_guardian_name = ${data.otherGuardianName || ''},
                other_guardian_relationship = ${data.otherGuardianRelationship || ''},
                photo = ${data.photo || ''},
                image_use_allowed = ${data.imageUseAllowed || false},
                image_use_document = ${data.imageUseDocument || ''},
                family_id = ${data.familyId || ''},
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
            if (present) {
                await sql`
                    UPDATE attendance 
                    SET present = TRUE, day = ${day}, daily_code = ${dailyCode || null}, dismissed_by = NULL
                    WHERE student_id = ${studentId} AND date = ${date}
                `;
            } else {
                await sql`
                    UPDATE attendance 
                    SET present = FALSE, dismissed_by = NULL, daily_code = NULL, ready_to_leave = FALSE
                    WHERE student_id = ${studentId} AND date = ${date}
                `;
            }
        } else {
            if (present) {
                await sql`
                    INSERT INTO attendance (id, student_id, date, present, day, dismissed_by, daily_code, created_at)
                    VALUES (${String(Date.now())}, ${studentId}, ${date}, TRUE, ${day}, NULL, ${dailyCode || null}, ${getTimestamp()})
                `;
            }
        }
    },

    async updateDismissal(studentId: string, date: string, responsibleName: string) {
        const sql = getSql();
        const result = await sql`
            UPDATE attendance 
            SET dismissed_by = ${responsibleName}, ready_to_leave = FALSE, daily_code = NULL
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
            INSERT INTO volunteers (id, name, class, phone, type, team, photo, email, created_at)
            VALUES (${String(Date.now())}, ${volunteer.name}, ${volunteer.class || ''}, ${volunteer.phone || ''}, ${volunteer.type || ''}, ${volunteer.team || ''}, ${volunteer.photo || ''}, ${volunteer.email || ''}, ${getTimestamp()})
        `;
    },

    async updateVolunteer(id: string, volunteer: any) {
        const sql = getSql();
        const result = await sql`
            UPDATE volunteers SET name = ${volunteer.name}, class = ${volunteer.class || ''}, phone = ${volunteer.phone || ''}, type = ${volunteer.type || ''}, team = ${volunteer.team || ''}, photo = ${volunteer.photo || ''}, email = ${volunteer.email || ''} WHERE id = ${String(id)}
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
            INSERT INTO schedule (id, date, className, team, supervisorId, deskId, coordinatorId, escadaId, corredorId, ministerIds, created_at)
            VALUES (
                ${String(Date.now())}, ${schedule.date}, ${schedule.className}, ${schedule.team || ''}, ${schedule.supervisorId || null}, 
                ${schedule.deskId || null}, ${schedule.coordinatorId || null}, ${schedule.escadaId || null}, ${schedule.corredorId || null}, ${ministerIdsStr}, ${getTimestamp()}
            )
        `;
    },

    async updateSchedule(id: string, schedule: any) {
        const sql = getSql();
        const ministerIdsStr = Array.isArray(schedule.ministerIds) ? schedule.ministerIds.join(',') : (schedule.ministerIds || '');
        const result = await sql`
            UPDATE schedule
            SET date = ${schedule.date}, className = ${schedule.className}, team = ${schedule.team || ''}, supervisorId = ${schedule.supervisorId || null}, 
                deskId = ${schedule.deskId || null}, coordinatorId = ${schedule.coordinatorId || null}, escadaId = ${schedule.escadaId || null},
                corredorId = ${schedule.corredorId || null}, ministerIds = ${ministerIdsStr}
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
                    INSERT INTO schedule (id, date, className, team, supervisorId, deskId, coordinatorId, escadaId, corredorId, ministerIds, created_at)
                    VALUES (
                        ${String(sch.id || Date.now())}, ${sch.date}, ${sch.className}, ${sch.team || ''}, ${sch.supervisorId || null}, 
                        ${sch.deskId || null}, ${sch.coordinatorId || null}, ${sch.escadaId || null}, ${sch.corredorId || null}, ${ministerIdsStr}, ${getTimestamp()}
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
        }));
    },

    async addPushSubscription(id: string, subscriptionJson: string, userEmail?: string, userName?: string, userRole?: string) {
        const sql = getSql();
        await sql`
            INSERT INTO push_subscriptions (id, subscription_json, user_email, user_name, user_role, created_at)
            VALUES (${id}, ${subscriptionJson}, ${userEmail || null}, ${userName || null}, ${userRole || null}, ${getTimestamp()})
            ON CONFLICT (id) DO UPDATE SET 
                subscription_json = EXCLUDED.subscription_json,
                user_email = EXCLUDED.user_email,
                user_name = EXCLUDED.user_name,
                user_role = EXCLUDED.user_role
        `;
    },

    async removePushSubscription(id: string) {
        const sql = getSql();
        await sql`DELETE FROM push_subscriptions WHERE id = ${id}`;
    },

    async getAllPushSubscriptions() {
        const sql = getSql();
        const result = await sql`SELECT id, subscription_json, user_email, user_name, user_role FROM push_subscriptions`;
        return result.map((r: any) => ({
            id: r.id,
            subscriptionJson: r.subscription_json,
            userEmail: r.user_email,
            userName: r.user_name,
            userRole: r.user_role
        }));
    },

    async addPrintJob(job: {
        id: string;
        studentId: string;
        studentName: string;
        className: string;
        securityCode: string;
        hasAllergy: boolean;
        allergyDescription: string;
        isBirthday: boolean;
        imageUseAllowed: boolean;
        studentType: string;
    }) {
        const sql = getSql();
        await sql`
            INSERT INTO print_queue (
                id, student_id, student_name, class_name, security_code, 
                has_allergy, allergy_description, is_birthday, image_use_allowed, 
                student_type, status, created_at
            ) VALUES (
                ${job.id}, ${job.studentId}, ${job.studentName}, ${job.className}, ${job.securityCode},
                ${job.hasAllergy}, ${job.allergyDescription}, ${job.isBirthday}, ${job.imageUseAllowed},
                ${job.studentType}, 'pending', ${getTimestamp()}
            )
        `;
    },

    async getPendingPrintJobs() {
        const sql = getSql();
        return await sql`
            SELECT id, student_id AS "studentId", student_name AS "student_name", class_name AS "class_name", security_code AS "security_code",
                   has_allergy AS "has_allergy", allergy_description AS "allergy_description", is_birthday AS "is_birthday", image_use_allowed AS "image_use_allowed",
                   student_type AS "student_type", status, created_at AS "created_at"
            FROM print_queue
            WHERE status = 'pending'
            ORDER BY created_at ASC
        `;
    },

    async getStudentById(id: string) {
        const sql = getSql();
        const rows = await sql`SELECT * FROM students WHERE id = ${String(id)}`;
        return rows[0] || null;
    },

    async completePrintJob(jobId: string) {
        const sql = getSql();
        await sql`
            UPDATE print_queue
            SET status = 'printed'
            WHERE id = ${jobId}
        `;
    }
};
