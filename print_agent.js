const fetch = require('node-fetch');
const puppeteer = require('puppeteer');
const ptp = require('pdf-to-printer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const AGENT_TOKEN = process.env.AGENT_TOKEN || 'sua_chave_secreta_aqui';
const PRINTER_NAME = process.env.PRINTER_NAME || 'Brother QL-700';
const POLLING_INTERVAL = 2000; // 2 segundos

async function getPendingJobs() {
    try {
        const res = await fetch(`${API_URL}/public/print/pending`, {
            headers: { 'X-Print-Agent-Token': AGENT_TOKEN }
        });
        if (!res.ok) {
            if (res.status === 401) {
                console.error("Token de autenticação (AGENT_TOKEN) inválido.");
            }
            return [];
        }
        return await res.json();
    } catch (err) {
        console.error("Erro ao buscar da fila:", err.message);
        return [];
    }
}

async function markAsPrinted(jobId) {
    try {
        await fetch(`${API_URL}/public/print/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Print-Agent-Token': AGENT_TOKEN
            },
            body: JSON.stringify({ jobId })
        });
    } catch (err) {
        console.error("Erro ao confirmar impressão:", err.message);
    }
}

function generateHTML(job) {
    const dateStr = new Date().toLocaleDateString('pt-BR');
    const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const codeStr = String(job.security_code).padStart(3, '0');

    // Auto-detect PCD/accessibility text inside allergy description
    const showSpecial = !!job.allergy_description && (
        job.allergy_description.toLowerCase().includes('pcd') || 
        job.allergy_description.toLowerCase().includes('autis') || 
        job.allergy_description.toLowerCase().includes('cadeir') ||
        job.allergy_description.toLowerCase().includes('defic') ||
        job.allergy_description.toLowerCase().includes('especial')
    );

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {
                margin: 0; padding: 0; width: 62mm; height: 100mm;
                font-family: system-ui, -apple-system, sans-serif;
                background-color: #fff; box-sizing: border-box;
            }
            .wrapper {
                width: 62mm; height: 100mm; box-sizing: border-box;
                padding: 4mm 4.5mm; display: flex; flex-direction: column;
                justify-content: space-between; border: 2px solid #000; border-radius: 6px;
            }
            .header { display: flex; align-items: center; justify-content: space-between; height: 6mm; }
            .brand { font-size: 9.5pt; font-weight: 900; text-transform: uppercase; }
            .time { font-size: 7pt; font-weight: 700; }
            .divider { height: 0.5mm; background-color: #000; width: 100%; margin: 1mm 0; }
            .name-container { height: 16mm; display: flex; align-items: center; justify-content: center; text-align: center; }
            .child-name { font-size: 16pt; font-weight: 850; text-transform: uppercase; margin: 0; line-height: 1.1; word-break: break-word; }
            .code-container { display: flex; align-items: center; justify-content: center; height: 24mm; }
            .security-code { font-size: 52pt; font-weight: 950; line-height: 1; }
            .status-indicators { display: flex; align-items: center; justify-content: center; gap: 3mm; height: 8mm; }
            .status-icon { width: 7.5mm; height: 7.5mm; color: #000; display: flex; align-items: center; justify-content: center; }
            .status-icon svg { width: 100%; height: 100%; }
            .footer-info { display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; height: 20mm; }
            .info-class { font-size: 11pt; font-weight: 800; text-transform: uppercase; }
            .info-allergy-desc { font-size: 7.5pt; font-weight: 750; text-transform: uppercase; border: 1.5px solid #000; padding: 1mm; border-radius: 4px; width: 100%; box-sizing: border-box; }
            
            /* Via 2 Specific Styles */
            .via2-banner { font-size: 11pt; font-weight: 900; text-align: center; background-color: #000; color: #fff; padding: 1.5mm 0; border-radius: 4px; text-transform: uppercase; }
            .via2-instructions { font-size: 9.5pt; font-weight: 850; text-align: center; line-height: 1.25; text-transform: uppercase; }
        </style>
    </head>
    <body>
        <!-- Renderização da Via 1 (Criança) -->
        <div class="wrapper">
            <div class="header">
                <span class="brand">Mundo Kids</span>
                <span class="time">${dateStr} ${timeStr}</span>
            </div>
            <div class="divider"></div>
            <div class="name-container">
                <h2 class="child-name">${job.student_name}</h2>
            </div>
            <div class="code-container">
                <span class="security-code">${codeStr}</span>
            </div>
            <div class="status-indicators">
                <!-- Restrição Alimentar -->
                ${job.has_allergy ? `
                <div class="status-icon" title="Restrição Alimentar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                </div>` : ''}

                <!-- Sem Autorização de Imagem -->
                ${!job.image_use_allowed ? `
                <div class="status-icon" title="Sem Autorização de Imagem">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="2" y1="2" x2="22" y2="22"/>
                        <path d="M7 21h10a2 2 0 0 0 2-2V9.4a2 2 0 0 0-.58-1.42l-2.42-2.4A2 2 0 0 0 14.58 5H13m-3.42.58L8.4 6.8H7a2 2 0 0 0-2 2v10.2A2 2 0 0 0 7 21Z"/>
                        <circle cx="12" cy="13" r="3"/>
                    </svg>
                </div>` : ''}

                <!-- Aniversariante -->
                ${job.is_birthday ? `
                <div class="status-icon" title="Aniversariante da Semana">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/>
                        <path d="M4 16h16"/>
                        <path d="M12 9V5"/>
                        <path d="M11 3a1 1 0 0 1 2 0v2h-2V3Z"/>
                    </svg>
                </div>` : ''}

                <!-- Necessidade Especial -->
                ${showSpecial ? `
                <div class="status-icon" title="Necessidade Especial / PCD">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="6" r="3"/>
                        <path d="M6 12h6a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H9a3 3 0 0 1-3-3v-6"/>
                        <path d="m19 12-4-4"/>
                    </svg>
                </div>` : ''}

                <!-- Visitante -->
                ${job.student_type === 'Visitante' ? `
                <div class="status-icon" title="Visitante">
                    <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                </div>` : ''}
            </div>
            <div class="divider"></div>
            <div class="footer-info">
                <div class="info-class">TURMA: ${job.class_name}</div>
                ${job.has_allergy && job.allergy_description ? `<div class="info-allergy-desc">${job.allergy_description}</div>` : ''}
            </div>
        </div>
        
        <!-- Quebra de página física -->
        <div style="page-break-after: always;"></div>

        <!-- Renderização da Via 2 (Responsável) -->
        <div class="wrapper">
            <div class="header">
                <span class="brand">Mundo Kids</span>
                <span class="time">${dateStr} ${timeStr}</span>
            </div>
            <div class="divider"></div>
            <div class="via2-banner">VIA DO RESPONSÁVEL</div>
            <div class="code-container">
                <span class="security-code">${codeStr}</span>
            </div>
            <div class="name-container" style="height: 12mm;">
                <h2 class="child-name" style="font-size: 13pt;">Criança: ${job.student_name}</h2>
            </div>
            <div class="divider"></div>
            <div class="footer-info" style="height: 15mm;">
                <div class="via2-instructions">APRESENTE ESTA VIA PARA A RETIRADA DO ALUNO</div>
            </div>
        </div>
    </body>
    </html>
    `;
}

async function processPrintJobs() {
    const jobs = await getPendingJobs();
    if (jobs.length === 0) return;

    console.log(`Encontrados ${jobs.length} trabalho(s) de impressão pendente(s).`);

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    for (const job of jobs) {
        try {
            console.log(`Gerando etiqueta para: ${job.student_name} (Code: ${job.security_code})...`);
            
            const htmlContent = generateHTML(job);
            await page.setContent(htmlContent);

            const tempPdfPath = path.join(__dirname, `temp_job_${job.id}.pdf`);
            await page.pdf({
                path: tempPdfPath,
                width: '62mm',
                height: '100mm',
                margin: { top: 0, bottom: 0, left: 0, right: 0 },
                printBackground: true
            });

            console.log("Enviando para a impressora...");
            await ptp.print(tempPdfPath, {
                printer: PRINTER_NAME
            });

            fs.unlinkSync(tempPdfPath);
            await markAsPrinted(job.id);
            console.log(`Trabalho ${job.id} impresso com sucesso!`);
        } catch (err) {
            console.error(`Erro ao processar trabalho ${job.id}:`, err.message);
        }
    }

    await browser.close();
}

console.log("Serviço de impressão Mundo Kids iniciado.");
setInterval(processPrintJobs, POLLING_INTERVAL);
