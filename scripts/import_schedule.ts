import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import csv from 'csv-parser';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config();

const csvFilePath = path.join(__dirname, '../escala.csv');

const getSql = () => {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL environment variable is missing.");
    }
    return neon(process.env.DATABASE_URL);
};

interface CsvRow {
    date: string;
    class: string;
    team: string;
}

const parseDate = (dn: string): string => {
    if (!dn) return '';
    const parts = dn.trim().split('/');
    if (parts.length === 3) {
        // Assume DD/MM/YYYY into YYYY-MM-DD
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    // Handle MM/DD/YYYY or natively properly formatted cases
    if (dn.includes('-')) {
        const parts2 = dn.trim().split('-');
        if (parts2.length === 3 && parts2[0].length === 4) return dn.trim(); // YYYY-MM-DD
    }
    return dn.trim();
};

const importSchedule = async () => {
    if (!fs.existsSync(csvFilePath)) {
        console.error(`Erro: Arquivo não encontrado em ${csvFilePath}`);
        process.exit(1);
    }

    const entriesToInsert: any[] = [];
    console.log('Lendo dados do arquivo CSV...');

    fs.createReadStream(csvFilePath)
        // Standardize headers to lowercase to match "date, class, team" as specified by user
        .pipe(csv({ separator: ';', mapHeaders: ({ header }) => header.trim().toLowerCase().replace(/^[\uFEFF\u200B]+/, '') }))
        .on('data', (row: any) => {
            // Check for potential fallback column names if "date" or "class" didn't match perfectly
            const rowDate = row.date || row.data || row.dia;
            const rowClass = row.class || row.turma;
            const rowTeam = row.team || row.equipe;

            if (!rowDate || !rowClass || !rowTeam) {
                return;
            }

            const entry = {
                id: crypto.randomUUID(),
                date: parseDate(rowDate),
                className: rowClass.trim(),
                team: rowTeam.trim()
            };

            entriesToInsert.push(entry);
        })
        .on('end', async () => {
            console.log(`CSV lido com sucesso. ${entriesToInsert.length} escalas encontradas.`);
            console.log('Iniciando DB Wipe e Importação...');

            const sql = getSql();
            try {
                // Wipe the current schedule
                await sql`DELETE FROM schedule`;
                console.log('Tabela de escalas limpa com sucesso.');

                let count = 0;
                for (const entry of entriesToInsert) {
                    await sql`
                        INSERT INTO schedule (id, date, className, team, created_at)
                        VALUES (${entry.id}, ${entry.date}, ${entry.className}, ${entry.team}, ${new Date().toISOString()})
                    `;
                    count++;
                }

                console.log(`\nImportação concluída! ${count} escalas cadastradas com sucesso no Neon Vercel Postgres.`);
                process.exit(0);
            } catch (err) {
                console.error('Erro na gravação ao Banco:', err);
                process.exit(1);
            }
        });
};

importSchedule();
