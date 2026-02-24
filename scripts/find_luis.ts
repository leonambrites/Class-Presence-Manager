import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config();

const getSql = () => neon(process.env.DATABASE_URL!);

async function run() {
    const sql = getSql();
    const miguels = await sql`SELECT name, has_allergy, allergy_description, class, age FROM students WHERE name ILIKE '%Miguel%'`;
    console.log('Todos Miguels:', miguels);

    const all = await sql`SELECT name FROM students`;
    console.log('Total students:', all.length);
}

run().catch(console.error);
