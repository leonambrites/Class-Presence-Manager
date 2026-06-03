import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config();

const getSql = () => {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL environment variable is missing.");
    }
    return neon(process.env.DATABASE_URL);
};

async function run() {
    const sql = getSql();
    console.log('Iniciando correção de nomes no banco de dados...');

    // Correção na tabela volunteers
    const result = await sql`
        UPDATE volunteers 
        SET team = 'Lélia Vasconcelos Gonçalves Moura' 
        WHERE team = 'L\x8Eelia Vasconcelos Gon\x8Dcalves Moura' 
           OR team = 'LŽelia Vasconcelos Gon calves Moura'
           OR team ILIKE '%L%elia%Gon%calves%Moura%'
        RETURNING id, name, team
    `;

    console.log(`Sucesso! ${result.length} voluntários atualizados.`);
    console.log('Resultados:', result);
}

run().catch(console.error);
