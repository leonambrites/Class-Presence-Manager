import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import csv from 'csv-parser';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

import { Readable } from 'stream';
import { decodeBuffer } from './encoding';

dotenv.config({ path: '.env.local' });
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

const MONTH_MAP: Record<string, string> = {
    'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04',
    'mai': '05', 'jun': '06', 'jul': '07', 'ago': '08',
    'sep': '09', 'set': '09', 'out': '10', 'nov': '11', 'dez': '12'
};

const parseDate = (dn: string): string => {
    if (!dn) return '';
    const parts = dn.trim().split('/');
    if (parts.length === 3) {
        let year = parts[2];
        if (year.length === 2) year = '20' + year;
        return `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    if (parts.length === 2) {
        const currentYear = new Date().getFullYear();
        let month = parts[1].toLowerCase();
        month = MONTH_MAP[month] || month.padStart(2, '0');
        return `${currentYear}-${month}-${parts[0].padStart(2, '0')}`;
    }
    if (dn.includes('-')) {
        const parts2 = dn.trim().split('-');
        if (parts2.length === 3 && parts2[0].length === 4) return dn.trim();
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

    const fileBuffer = fs.readFileSync(csvFilePath);
    const decodedContent = decodeBuffer(fileBuffer);
    const contentStream = Readable.from([decodedContent]);

    contentStream
        // Use tab separator instead of ;
        .pipe(csv({ separator: '\t', mapHeaders: ({ header }) => header.trim().toLowerCase().replace(/^[\uFEFF\u200B]+/, '') }))
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
