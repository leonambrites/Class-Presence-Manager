import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config();

const getSql = () => neon(process.env.DATABASE_URL!);

async function run() {
    const sql = getSql();
    const count = await sql`SELECT count(*) FROM students`;
    console.log('Total students:', count[0].count);

    const result = await sql`SELECT name, has_allergy, allergy_description, class FROM students WHERE name ILIKE '%Luis Miguel%'`;
    console.log('Luis Miguel:', result);

    const allNames = await sql`SELECT name FROM students`;
    console.log('Total recorded names:', allNames.length);
}

run().catch(console.error);
