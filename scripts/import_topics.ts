import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import csv from 'csv-parser';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config();

const csvFilePath = path.join(__dirname, '../tema_aulas.csv');

const getSql = () => {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL environment variable is missing.");
    }
    return neon(process.env.DATABASE_URL);
};

interface CsvRow {
    date: string;
    title: string;
    description: string;
}

const parseDate = (dn: string): string => {
    if (!dn) return '';
    const parts = dn.trim().split('/');
    if (parts.length === 3) {
        // Return YYYY-MM-DD
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return dn.trim();
};

const importTopics = async () => {
    if (!fs.existsSync(csvFilePath)) {
        console.error(`Erro: Arquivo não encontrado em ${csvFilePath}`);
        process.exit(1);
    }

    const topicsToInsert: any[] = [];
    console.log('Lendo dados do arquivo CSV...');

    fs.createReadStream(csvFilePath)
        .pipe(csv({ separator: ';', mapHeaders: ({ header }) => header.trim().replace(/^[\uFEFF\u200B]+/, '') }))
        .on('data', (row: CsvRow) => {
            if (!row.date || row.date.trim() === '') return;

            const topic = {
                id: crypto.randomUUID(),
                date: parseDate(row.date),
                title: row.title ? row.title.trim() : '',
                description: row.description ? row.description.trim() : ''
            };

            topicsToInsert.push(topic);
        })
        .on('end', async () => {
            console.log(`CSV lido com sucesso. ${topicsToInsert.length} tópicos encontrados.`);
            console.log('Iniciando DB Wipe e Importação...');

            const sql = getSql();
            try {
                await sql`DELETE FROM topics`;
                console.log('Tabela de tópicos limpa com sucesso.');

                let count = 0;
                for (const topic of topicsToInsert) {
                    await sql`
                        INSERT INTO topics (id, date, title, description, created_at)
                        VALUES (${topic.id}, ${topic.date}, ${topic.title}, ${topic.description}, ${new Date().toISOString()})
                    `;
                    count++;
                }

                console.log(`\nImportação concluída! ${count} tópicos cadastrados com sucesso no Neon Vercel Postgres.`);
                process.exit(0);
            } catch (err) {
                console.error('Erro na gravação ao Banco:', err);
                process.exit(1);
            }
        });
};

importTopics();
