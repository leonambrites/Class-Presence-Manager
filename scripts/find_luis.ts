import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config();

const getSql = () => neon(process.env.DATABASE_URL!);

async function run() {
    const sql = getSql();
    const uniqueTeams = await sql`SELECT DISTINCT team FROM volunteers`;
    console.log('Unique team values in volunteers table:', uniqueTeams);
}

run().catch(console.error);
