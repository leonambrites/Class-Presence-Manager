import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config();

const getSql = () => {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL environment variable is missing.");
    }
    return neon(process.env.DATABASE_URL);
};

const fixClasses = async () => {
    const sql = getSql();

    console.log("Corrindo MATERNAL...");
    await sql`UPDATE students SET class = 'Maternal' WHERE class = 'MATERNAL'`;

    console.log("Corrindo 2 a 3 anos...");
    await sql`UPDATE students SET class = '2 a 3 anos' WHERE class = '02 A 03'`;

    console.log("Corrindo 4 a 5 anos...");
    await sql`UPDATE students SET class = '4 a 5 anos' WHERE class = '04 a 05'`;

    console.log("Corrindo 6 a 7 anos...");
    await sql`UPDATE students SET class = '6 a 7 anos' WHERE class = '06 a 07'`;

    console.log("Corrindo 8 a 10 anos...");
    await sql`UPDATE students SET class = '8 a 10 anos' WHERE class = '08 a 10'`;

    console.log("Corrindo Seeds (se houver diferenças de caixa)...");
    await sql`UPDATE students SET class = 'Seeds' WHERE class = 'SEEDS' OR class = 'seeds'`;

    // Checking results
    const res = await sql`SELECT class, COUNT(*) FROM students GROUP BY class`;
    console.log("\nStatus Atual do Banco de Dados Vercel Postgres:");
    console.table(res);
}

fixClasses().catch(console.error);
