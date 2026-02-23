import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config();

const getSql = () => {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL environment variable is missing.");
    }
    return neon(process.env.DATABASE_URL);
};

const wipeDatabase = async () => {
    console.log("Conectando ao banco de dados...");
    const sql = getSql();

    try {
        console.log("Removendo todos os registros de presença (attendance)...");
        await sql`DELETE FROM attendance`;

        console.log("Removendo todos os registros de alunos (students)...");
        await sql`DELETE FROM students`;

        console.log("Banco de dados limpo com sucesso!");
        process.exit(0);
    } catch (e) {
        console.error("Erro ao limpar o banco de dados:", e);
        process.exit(1);
    }
}

wipeDatabase();
