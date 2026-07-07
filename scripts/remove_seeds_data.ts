import * as fs from 'fs';
import * as path from 'path';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const getSql = () => {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL environment variable is missing.");
    }
    return neon(process.env.DATABASE_URL.replace(/^["']|["']$/g, ''));
};

async function main() {
    try {
        console.log("=== INICIANDO LIMPEZA DA TURMA SEEDS ===");

        // 1. Limpeza no constants.ts
        const constantsPath = path.join(__dirname, '../constants.ts');
        console.log(`Lendo ${constantsPath}...`);
        const constantsContent = fs.readFileSync(constantsPath, 'utf8');
        const constantsLines = constantsContent.split('\n');
        
        // Filtrar linhas que contenham '"class": "Seeds"' ou '"Seeds"'
        const filteredLines = constantsLines.filter(line => {
            const hasSeedsClass = line.includes('"class": "Seeds"') || line.includes('"class": \'Seeds\'');
            return !hasSeedsClass;
        });

        console.log(`Linhas no constants.ts original: ${constantsLines.length}. Após filtro: ${filteredLines.length}`);
        fs.writeFileSync(constantsPath, filteredLines.join('\n'), 'utf8');
        console.log("constants.ts limpo com sucesso!");

        // 2. Limpeza no data/students.json
        const studentsJsonPath = path.join(__dirname, '../data/students.json');
        console.log(`Lendo ${studentsJsonPath}...`);
        if (fs.existsSync(studentsJsonPath)) {
            const studentsJsonContent = fs.readFileSync(studentsJsonPath, 'utf8');
            const students = JSON.parse(studentsJsonContent);
            const filteredStudents = students.filter((s: any) => s.class !== 'Seeds');
            console.log(`Estudantes originais no JSON: ${students.length}. Após filtro: ${filteredStudents.length}`);
            fs.writeFileSync(studentsJsonPath, JSON.stringify(filteredStudents, null, 2), 'utf8');
            console.log("data/students.json limpo com sucesso!");
        } else {
            console.log("Aviso: data/students.json não encontrado.");
        }

        // 3. Limpeza no Banco de Dados PostgreSQL
        console.log("Conectando ao banco de dados PostgreSQL...");
        const sql = getSql();
        
        // Deletar alunos da turma Seeds (exclusão em cascata cuidará das presenças/attendance)
        console.log("Executando query de exclusão de alunos...");
        const deletedStudents = await sql`
            DELETE FROM students WHERE class = 'Seeds' RETURNING id, name
        `;
        console.log(`Sucesso: ${deletedStudents.length} alunos da turma 'Seeds' removidos do banco.`);

        // Deletar escalas associadas à turma Seeds
        console.log("Executando query de exclusão de escalas...");
        const deletedSchedules = await sql`
            DELETE FROM schedule WHERE classname = 'Seeds' RETURNING id, date
        `;
        console.log(`Sucesso: ${deletedSchedules.length} escalas da turma 'Seeds' removidas do banco.`);

        console.log("=== LIMPEZA DE SEEDS CONCLUÍDA COM SUCESSO ===");
        process.exit(0);
    } catch (error) {
        console.error("Erro durante a limpeza da turma Seeds:", error);
        process.exit(1);
    }
}

main();
