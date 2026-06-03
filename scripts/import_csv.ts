import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import csv from 'csv-parser';
import { dbService } from '../api/dbService';
import { StudentType } from '../types';

import { Readable } from 'stream';
import { decodeBuffer } from './encoding';

// O caminho para o arquivo alunos.csv na raiz do projeto
const csvFilePath = path.join(__dirname, '../alunos.csv');

interface CsvRow {
    NOME: string;
    DN: string;
    ID: string;
    MEMBRO: string;
    RESP: string;
    TEL: string;
    ALERGIA: string;
    TURMA: string;
}

const parseDate = (dn: string): string => {
    if (!dn) return '';
    const parts = dn.trim().split('/');
    if (parts.length === 3) {
        // Retorna no formato YYYY-MM-DD
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return dn.trim();
};

const importStudents = async () => {
    if (!fs.existsSync(csvFilePath)) {
        console.error(`Erro: Arquivo não encontrado em ${csvFilePath}`);
        console.error('Por favor, coloque o arquivo alunos.csv na pasta principal do projeto.');
        process.exit(1);
    }

    const studentsToInsert: any[] = [];

    console.log('Lendo dados do arquivo CSV...');

    const fileBuffer = fs.readFileSync(csvFilePath);
    const decodedContent = decodeBuffer(fileBuffer);
    const contentStream = Readable.from([decodedContent]);

    contentStream
        .pipe(csv({ separator: ';', mapHeaders: ({ header }) => header.trim().replace(/^[\uFEFF\u200B]+/, '') }))
        .on('data', (row: CsvRow) => {
            console.log("Raw Row data:", JSON.stringify(row));
            // Ignora linhas totalmente vazias
            if (!row.NOME || row.NOME.trim() === '') return;

            const membroStr = row.MEMBRO ? row.MEMBRO.trim().toLowerCase() : '';
            const type = (membroStr === 'sim') ? StudentType.Membro : StudentType.Visitante;

            const alergiaStr = row.ALERGIA ? row.ALERGIA.trim() : '';
            const isNoAllergy = !alergiaStr || alergiaStr.toLowerCase() === 'não' || alergiaStr.toLowerCase() === 'nao';

            const hasAllergy = !isNoAllergy;
            const allergyDescription = hasAllergy ? alergiaStr : '';

            const age = parseInt(row.ID, 10) || 0;
            let calculatedClass = '';
            if (age < 2) calculatedClass = 'Maternal';
            else if (age < 4) calculatedClass = '2 a 3 anos';
            else if (age < 6) calculatedClass = '4 a 5 anos';
            else if (age < 8) calculatedClass = '6 a 7 anos';
            else if (age < 11) calculatedClass = '8 a 10 anos';
            else calculatedClass = 'Seeds';

            const student = {
                id: crypto.randomUUID(), // Unique ID 
                name: row.NOME.trim(),
                birthday: parseDate(row.DN),
                age: age,
                type: type,
                guardianName: row.RESP ? row.RESP.trim() : '',
                phone: row.TEL ? row.TEL.trim() : '',
                hasAllergy: hasAllergy,
                allergyDescription: allergyDescription,
                class: calculatedClass
            };

            studentsToInsert.push(student);
        })
        .on('end', async () => {
            console.log(`CSV lido com sucesso. ${studentsToInsert.length} alunos encontrados.`);
            console.log('Iniciando importação para o banco de dados online...');

            let count = 0;
            for (const student of studentsToInsert) {
                try {
                    await dbService.addStudent(student);
                    count++;
                    if (count % 10 === 0) {
                        console.log(`${count}/${studentsToInsert.length} alunos inseridos...`);
                    }
                } catch (error) {
                    console.error(`Erro ao inserir o aluno ${student.name}:`, error);
                }
            }

            console.log(`\nImportação concluída! ${count} alunos foram cadastrados no sistema.`);
            process.exit(0);
        });
};

importStudents();
