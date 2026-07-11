import { google } from "googleapis";
import { JWT } from "google-auth-library";

// Configurações do Google Sheets
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

// Variáveis de ambiente com chaves fornecidas
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;



// Autenticação
function getSheetsClient() {
    if (!SPREADSHEET_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_SERVICE_ACCOUNT_KEY) {
        throw new Error("Google Sheets credentials not configured. Please set SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_SERVICE_ACCOUNT_KEY environment variables.");
    }
    const client = new JWT({
        email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: GOOGLE_SERVICE_ACCOUNT_KEY.replace(/\\n/g, '\n'), // Ensure newlines are correctly interpreted
        scopes: SCOPES,
    });
    return google.sheets({ version: "v4", auth: client });
}

// Helper para transformar linhas em objetos baseado nos headers
function rowsToObjects(rows: any[], headers: string[]) {
    if (!rows || rows.length === 0) return [];
    return rows.map((row) => {
        const obj: any = {};
        headers.forEach((header, index) => {
            // Trata campos vazios
            let value = row[index] !== undefined ? row[index] : null;

            // Conversões específicas
            if (header === 'age') value = value ? parseInt(value) : 0;
            if (header === 'present') value = value === 'TRUE';
            if (header === 'ministerIds' && value) value = value.split(',');
            if (header === 'ministerIds' && !value) value = [];

            obj[header] = value;
        });
        return obj;
    });
}

// Estrutura de dados esperada pelo Frontend
export interface DataPayload {
    students: any[];
    volunteers: any[];
    schedule: any[];
    topics: any[];
}

export const googleSheetsService = {
    // Ler todos os dados e formatar para o frontend
    async getAllData(): Promise<DataPayload> {
        const sheets = getSheetsClient();
        const ranges = [
            "Students!A2:I", // Updated range to include Birthday
            "Attendance!A2:F",
            "Volunteers!A2:C",
            "Schedule!A2:I",
            "Topics!A2:D"
        ];

        const response = await sheets.spreadsheets.values.batchGet({
            spreadsheetId: SPREADSHEET_ID,
            ranges,
        });

        const valueRanges = response.data.valueRanges || [];

        // Mapeamento das Abas
        const rawStudents = valueRanges[0].values || [];
        const rawAttendance = valueRanges[1].values || [];
        const rawVolunteers = valueRanges[2].values || [];
        const rawSchedule = valueRanges[3].values || [];
        const rawTopics = valueRanges[4].values || [];

        // Transformação para Objetos
        // Updated headers to include 'birthday' before 'updated_at'
        const students = rowsToObjects(rawStudents, ['id', 'name', 'class', 'age', 'motherName', 'phone', 'type', 'birthday', 'updated_at']);
        const attendance = rowsToObjects(rawAttendance, ['id', 'studentId', 'date', 'present', 'day', 'dismissedBy']);
        const volunteers = rowsToObjects(rawVolunteers, ['id', 'name', 'updated_at']);
        const schedule = rowsToObjects(rawSchedule, ['id', 'date', 'className', 'supervisorId', 'deskId', 'coordinatorId', 'escadaId', 'corredorId', 'ministerIds']);
        const topics = rowsToObjects(rawTopics, ['id', 'date', 'title', 'description']);

        // Aninhar attendance dentro de students (Requisito do Frontend)
        students.forEach((student: any) => {
            student.attendance = attendance.filter((a: any) => a.studentId === student.id);
        });

        return { students, volunteers, schedule, topics };
    },

    // Adicionar Aluno
    async addStudent(student: any) {
        const sheets = getSheetsClient();
        const values = [[
            student.id,
            student.name,
            student.class,
            student.age,
            student.motherName,
            student.phone,
            student.type,
            student.birthday || "", // New field
            new Date().toISOString()
        ]];

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: "Students!A:I", // Extended range
            valueInputOption: "USER_ENTERED",
            requestBody: { values },
        });
    },

    // Atualizar Aluno (PUT)
    async updateStudent(id: string, data: any) {
        const sheets = getSheetsClient();
        // 1. Encontrar a linha pelo ID
        const idList = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "Students!A:A"
        });

        const rows = idList.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === id);

        if (rowIndex === -1) throw new Error("Student not found");
        const sheetRow = rowIndex + 1; // Google Sheets é 1-based

        // 2. Preparar dados para atualização
        const values = [[
            data.name,
            data.class,
            data.age,
            data.motherName,
            data.phone,
            data.type,
            data.birthday || "", // New field
            new Date().toISOString()
        ]];

        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `Students!B${sheetRow}:I${sheetRow}`, // Extended range
            valueInputOption: "USER_ENTERED",
            requestBody: { values }
        });
    },

    // Deletar Aluno
    async deleteStudent(id: string) {
        const sheets = getSheetsClient();
        const idList = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "Students!A:A"
        });

        const rows = idList.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === id);

        if (rowIndex === -1) throw new Error("Student not found");

        // Obter metadados para ter o sheetId
        const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
        const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === "Students");
        const sheetId = sheet?.properties?.sheetId;

        if (sheetId === undefined) throw new Error("Sheet 'Students' not found");

        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: sheetId,
                            dimension: "ROWS",
                            startIndex: rowIndex,
                            endIndex: rowIndex + 1
                        }
                    }
                }]
            }
        });
    },

    // Marcar/Atualizar Presença
    async updateAttendance(studentId: string, date: string, present: boolean, day: string) {
        const sheets = getSheetsClient();

        // Buscar todas as presenças para ver se já existe registro para esse aluno nesta data
        const list = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "Attendance!A:C" // Ler ID, StudentID, Date
        });

        const rows = list.data.values || [];
        const rowIndex = rows.findIndex(row => row[1] === studentId && row[2] === date);

        if (rowIndex !== -1) {
            // Atualizar existente
            const sheetRow = rowIndex + 1;
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `Attendance!D${sheetRow}:E${sheetRow}`, // Atualiza Present e Day
                valueInputOption: "USER_ENTERED",
                requestBody: {
                    values: [[present ? "TRUE" : "FALSE", day]]
                }
            });

            // Se present = false, limpar dismissedBy (Coluna F)
            if (!present) {
                await sheets.spreadsheets.values.update({
                    spreadsheetId: SPREADSHEET_ID,
                    range: `Attendance!F${sheetRow}`,
                    valueInputOption: "USER_ENTERED",
                    requestBody: { values: [[""]] }
                });
            }

        } else {
            // Criar novo
            if (present) {
                const newId = Date.now().toString();
                const values = [[newId, studentId, date, "TRUE", day, ""]];
                await sheets.spreadsheets.values.append({
                    spreadsheetId: SPREADSHEET_ID,
                    range: "Attendance!A:F",
                    valueInputOption: "USER_ENTERED",
                    requestBody: { values }
                });
            }
        }
    },

    // Registrar Saída
    async updateDismissal(studentId: string, date: string, responsibleName: string) {
        const sheets = getSheetsClient();
        const list = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "Attendance!A:C"
        });

        const rows = list.data.values || [];
        const rowIndex = rows.findIndex(row => row[1] === studentId && row[2] === date);

        if (rowIndex !== -1) {
            const sheetRow = rowIndex + 1;
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `Attendance!F${sheetRow}`,
                valueInputOption: "USER_ENTERED",
                requestBody: { values: [[responsibleName]] }
            });
        } else {
            throw new Error("Attendance record not found to dismiss");
        }
    },

    // Adicionar Tópico
    async addTopic(date: string, title: string, description: string) {
        const sheets = getSheetsClient();
        const values = [[Date.now().toString(), date, title, description]];

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: "Topics!A:D",
            valueInputOption: "USER_ENTERED",
            requestBody: { values },
        });
    },

    // Popular Banco de Dados (Seed)
    async seedDatabase(data: any) {
        const sheets = getSheetsClient();

        // Headers definition
        const headers = {
            Students: ['id', 'name', 'class', 'age', 'motherName', 'phone', 'type', 'birthday', 'updated_at'], // Added birthday
            Attendance: ['id', 'studentId', 'date', 'present', 'day', 'dismissedBy'],
            Volunteers: ['id', 'name', 'updated_at'],
            Schedule: ['id', 'date', 'className', 'supervisorId', 'deskId', 'coordinatorId', 'escadaId', 'corredorId', 'ministerIds'],
            Topics: ['id', 'date', 'title', 'description']
        };

        // Helper to reset sheet with headers
        const resetSheet = async (sheetName: string, sheetHeaders: string[], values: any[]) => {
            // Clear everything
            await sheets.spreadsheets.values.clear({
                spreadsheetId: SPREADSHEET_ID,
                range: `${sheetName}!A:ZZZ`
            });

            // Delay to prevent rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));

            // Write Headers and Data
            const allValues = [sheetHeaders, ...values];

            if (allValues.length === 0) return;

            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: `${sheetName}!A1`,
                valueInputOption: "USER_ENTERED",
                requestBody: { values: allValues }
            });
        };

        // 1. Students
        const studentValues = data.students.map((s: any) => [
            s.id,
            s.name,
            s.class,
            s.age,
            s.motherName,
            s.phone,
            s.type,
            s.birthday || "", // Map birthday from data (will be empty for initial constants)
            new Date().toISOString()
        ]);

        // 2. Attendance (Flattened)
        const attendanceValues: any[] = [];
        data.students.forEach((s: any) => {
            if (s.attendance && Array.isArray(s.attendance)) {
                s.attendance.forEach((a: any) => {
                    const dateObj = new Date(a.date + 'T00:00:00');
                    let dayStr = a.day;
                    if (!dayStr) {
                        const dayIdx = dateObj.getDay();
                        if (dayIdx === 0) dayStr = 'Sunday';
                        else if (dayIdx === 3) dayStr = 'Wednesday';
                        else dayStr = '';
                    }

                    attendanceValues.push([
                        Math.random().toString(36).substr(2, 9),
                        s.id,
                        a.date,
                        a.present ? "TRUE" : "FALSE",
                        dayStr,
                        a.dismissedBy || ""
                    ]);
                });
            }
        });

        // 3. Volunteers
        const volunteerValues = data.volunteers.map((v: any) => [
            v.id,
            v.name,
            new Date().toISOString()
        ]);

        // 4. Schedule
        const scheduleValues = data.schedule.map((s: any) => [
            s.id || Math.random().toString(36).substr(2, 9),
            s.date,
            s.className,
            s.supervisorId || "",
            s.deskId || "",
            s.coordinatorId || "",
            s.escadaId || "",
            s.corredorId || "",
            Array.isArray(s.ministerIds) ? s.ministerIds.join(',') : (s.ministerIds || "")
        ]);

        // 5. Topics
        const topicValues = data.topics.map((t: any) => [
            Math.random().toString(36).substr(2, 9),
            t.date,
            t.title,
            t.description
        ]);

        // Executar Reset Sequencial (para evitar rate limit)
        await resetSheet("Students", headers.Students, studentValues);
        await resetSheet("Attendance", headers.Attendance, attendanceValues);
        await resetSheet("Volunteers", headers.Volunteers, volunteerValues);
        await resetSheet("Schedule", headers.Schedule, scheduleValues);
        await resetSheet("Topics", headers.Topics, topicValues);
    }
};
