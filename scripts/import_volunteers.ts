import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import csv from 'csv-parser';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config();

const csvFilePath = path.join(__dirname, '../equipe.csv');

const getSql = () => {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL environment variable is missing.");
    }
    return neon(process.env.DATABASE_URL);
};

interface CsvRow {
    Tipo: string;
    Nome: string;
    Turma: string;
    'Equipe | Supervisora': string;
    Contato: string;
}

const importVolunteers = async () => {
    if (!fs.existsSync(csvFilePath)) {
        console.error(`Erro: Arquivo não encontrado em ${csvFilePath}`);
        process.exit(1);
    }

    const volunteersToInsert: any[] = [];
    console.log('Lendo dados do arquivo CSV...');

    fs.createReadStream(csvFilePath)
        // Adjust the mapHeaders to handle potential BOM and trailing spaces exactly
        .pipe(csv({ separator: ';', mapHeaders: ({ header }) => header.trim().replace(/^[\uFEFF\u200B]+/, '') }))
        .on('data', (row: CsvRow) => {
            if (!row.Nome || row.Nome.trim() === '') return;

            const volunteer = {
                id: crypto.randomUUID(),
                name: row.Nome.trim(),
                class: row.Turma ? row.Turma.trim() : '',
                team: row.Tipo ? row.Tipo.trim() : '', // 'Ministra' ou 'Coordenadora'
                phone: row.Contato ? row.Contato.trim() : '',
            };

            volunteersToInsert.push(volunteer);
        })
        .on('end', async () => {
            console.log(`CSV lido com sucesso. ${volunteersToInsert.length} voluntários encontrados.`);
            console.log('Iniciando DB Wipe e Importação...');

            const sql = getSql();
            try {
                await sql`DELETE FROM volunteers`;
                console.log('Tabela de voluntários limpa com sucesso.');

                let count = 0;
                for (const vol of volunteersToInsert) {
                    await sql`
                        INSERT INTO volunteers (id, name, class, phone, team, created_at)
                        VALUES (${vol.id}, ${vol.name}, ${vol.class}, ${vol.phone}, ${vol.team}, ${new Date().toISOString()})
                    `;
                    count++;
                }

                console.log(`\nImportação concluída! ${count} voluntários cadastrados com sucesso no Neon Vercel Postgres.`);
                process.exit(0);
            } catch (err) {
                console.error('Erro na gravação ao Banco:', err);
                process.exit(1);
            }
        });
};

importVolunteers();
