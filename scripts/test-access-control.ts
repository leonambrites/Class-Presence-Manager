import fetch from 'node-fetch';

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

async function runTests() {
    console.log(`=== INICIANDO TESTES DE CONTROLE DE ACESSO NA API (Backend) ===`);
    console.log(`Testando contra o servidor local em: ${BASE_URL}\n`);

    let vulnerabilitiesFound = 0;

    // Teste 1: GET /api/users
    try {
        console.log(`[TESTE 1] GET /api/users (Listar Usuários do Clerk)`);
        const res = await fetch(`${BASE_URL}/api/users`);
        console.log(`Status HTTP: ${res.status}`);
        if (res.ok) {
            const data = await res.json();
            console.log(`❌ VULNERÁVEL: Endpoint respondeu com 200 OK. Retornou ${Array.isArray(data) ? data.length : 0} usuários.`);
            vulnerabilitiesFound++;
        } else {
            console.log(`✅ SEGURO: Acesso negado com status ${res.status}`);
        }
    } catch (e: any) {
        console.log(`⚠️ Erro ao acessar o endpoint: ${e.message}`);
    }
    console.log('-'.repeat(50));

    // Teste 2: GET /api/data
    let validStudentId = '';
    try {
        console.log(`[TESTE 2] GET /api/data (Listar Todos os Dados do Banco)`);
        const res = await fetch(`${BASE_URL}/api/data`);
        console.log(`Status HTTP: ${res.status}`);
        if (res.ok) {
            const data: any = await res.json();
            console.log(`❌ VULNERÁVEL: Endpoint respondeu com 200 OK.`);
            console.log(`   - Total de Alunos: ${data?.students?.length || 0}`);
            console.log(`   - Total de Professores: ${data?.volunteers?.length || 0}`);
            console.log(`   - Total de Aulas: ${data?.topics?.length || 0}`);
            vulnerabilitiesFound++;
            
            if (data?.students && data.students.length > 0) {
                validStudentId = data.students[0].id;
            }
        } else {
            console.log(`✅ SEGURO: Acesso negado com status ${res.status}`);
        }
    } catch (e: any) {
        console.log(`⚠️ Erro ao acessar o endpoint: ${e.message}`);
    }
    console.log('-'.repeat(50));

    // Teste 3: POST /api/attendance
    try {
        console.log(`[TESTE 3] POST /api/attendance (Marcar/Desmarcar Presença)`);
        if (!validStudentId) {
            console.log(`⚠️ Ignorando teste real do POST /api/attendance: nenhum ID de aluno válido obtido no teste anterior.`);
        } else {
            console.log(`Usando ID de aluno existente: ${validStudentId}`);
            const res = await fetch(`${BASE_URL}/api/attendance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: validStudentId,
                    date: '2026-07-06',
                    present: true,
                    day: 'Segunda-feira',
                    dailyCode: 9999
                })
            });
            console.log(`Status HTTP: ${res.status}`);
            if (res.ok) {
                console.log(`❌ VULNERÁVEL: Endpoint respondeu com 200 OK (Presença marcada sem autenticação!).`);
                vulnerabilitiesFound++;
            } else {
                console.log(`✅ SEGURO: Acesso negado com status ${res.status}`);
            }
        }
    } catch (e: any) {
        console.log(`⚠️ Erro ao acessar o endpoint: ${e.message}`);
    }
    console.log('-'.repeat(50));

    // Teste 4: PATCH /api/users/mock-id/metadata
    try {
        console.log(`[TESTE 4] PATCH /api/users/mock-id/metadata (Alterar Permissões)`);
        const res = await fetch(`${BASE_URL}/api/users/mock-id/metadata`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                role: 'Pastor'
            })
        });
        console.log(`Status HTTP: ${res.status}`);
        // Note: this should return 500 or 400 since mock-id is invalid in Clerk, 
        // but if it is not 401/403, it means the auth logic isn't even checking authentication first.
        if (res.status === 200 || res.status === 500) {
            const bodyText = await res.text();
            if (bodyText.includes('Failed to update Clerk user metadata') || bodyText.includes('metadata updated')) {
                console.log(`❌ VULNERÁVEL: O servidor tentou executar a alteração no Clerk (e falhou apenas por ID inválido, não por falta de autenticação).`);
                vulnerabilitiesFound++;
            } else {
                console.log(`✅ SEGURO/DESCONHECIDO: Resposta: ${bodyText}`);
            }
        } else {
            console.log(`✅ SEGURO: Acesso negado com status ${res.status}`);
        }
    } catch (e: any) {
        console.log(`⚠️ Erro ao acessar o endpoint: ${e.message}`);
    }
    console.log('='.repeat(50));

    console.log(`\n=== RESUMO DOS TESTES ===`);
    if (vulnerabilitiesFound > 0) {
        console.log(`❌ Foram encontradas ${vulnerabilitiesFound} vulnerabilidades nos controles de acesso da API!`);
        console.log(`Recomendação: Implementar verificação de tokens JWT do Clerk na camada do Express.`);
    } else {
        console.log(`✅ Todos os endpoints testados estão protegidos contra acessos não autorizados.`);
    }
}

runTests();
