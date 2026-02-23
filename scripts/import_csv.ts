import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { dbService } from '../api/dbService';
import { StudentType } from '../types';

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

    fs.createReadStream(csvFilePath)
        .pipe(csv({ separator: ',' })) // Pode precisar ser ';' se o Excel estiver em português BR
        .on('data', (row: CsvRow) => {
            // Ignora linhas totalmente vazias
            if (!row.NOME || row.NOME.trim() === '') return;

            const membroStr = row.MEMBRO ? row.MEMBRO.trim().toLowerCase() : '';
            const type = (membroStr === 'sim') ? StudentType.Membro : StudentType.Visitante;

            const alergiaStr = row.ALERGIA ? row.ALERGIA.trim() : '';
            const isNoAllergy = !alergiaStr || alergiaStr.toLowerCase() === 'não' || alergiaStr.toLowerCase() === 'nao';

            const hasAllergy = !isNoAllergy;
            const allergyDescription = hasAllergy ? alergiaStr : '';

            const student = {
                id: String(Date.now() + Math.floor(Math.random() * 10000)), // Unique ID 
                name: row.NOME.trim(),
                birthday: parseDate(row.DN),
                age: parseInt(row.ID, 10) || 0,
                type: type,
                motherName: row.RESP ? row.RESP.trim() : '',
                phone: row.TEL ? row.TEL.trim() : '',
                hasAllergy: hasAllergy,
                allergyDescription: allergyDescription,
                class: row.TURMA ? row.TURMA.trim() : ''
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
