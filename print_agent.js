const fetch = require('node-fetch');
const ptp = require('pdf-to-printer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const API_URL = process.env.API_URL || 'https://gestao-mundo-kids.vercel.app/api';
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
                    <svg viewBox="0 0 122.88 122.88">
                        <path fill="#fff" d="M21.2,32.93,90,101.68A49.42,49.42,0,0,1,42.58,107,49.25,49.25,0,0,1,12.13,61.44h0A49.12,49.12,0,0,1,21.2,32.93ZM98.92,93.5,29.38,24A49.32,49.32,0,0,1,98.92,93.5Z"/>
                        <path fill="#fff" d="M98.92,29.38,29.39,98.92A49.31,49.31,0,0,0,98.92,29.38ZM21.2,90,90,21.2a49.24,49.24,0,0,0-63.38,5.37A49,49,0,0,0,12.13,61.44h0A49.12,49.12,0,0,0,21.2,90Z"/>
                        <path fill="currentColor" fill-rule="evenodd" d="M51.84,58.25c3.14-2.15,4.73-5,4.46-11.39V30.3c0-2.32-4.23-2.59-4.43,0l-.16,13.42a1.89,1.89,0,0,1-3.77,0l.16-13.91c0-2.48-4.06-2.71-4.06,0,0,3.86-.16,10-.16,13.88a1.84,1.84,0,0,1,0,.33,1.64,1.64,0,1,1-3.28,0,1.86,1.86,0,0,1,0-.33l.16-13.78a2.26,2.26,0,0,0-3.56-1.67c-1.49,1-1.18,2.86-1.25,4.47l-.51,15.83c.08,4.6,1.29,8.34,4.89,9.93a9.17,9.17,0,0,0,2.19.57L41.35,90.89V91a4.06,4.06,0,0,0,4,4.07h.5a4.56,4.56,0,0,0,4.49-4.55.53.53,0,0,0,0-.13L49.24,59a6.75,6.75,0,0,0,2.6-.77Zm19.38,31.5-.07-27.92C59,54.81,62.88,27.75,75,28c14.79.16,16.54,30.48,3.82,33.86l.92,28.07c.18,6.59-8.57,7.2-8.59-.15Z"/>
                        <path fill="currentColor" d="M61.44,122.88a61.31,61.31,0,1,1,23.49-4.66,61.29,61.29,0,0,1-23.49,4.66ZM21.2,90,90,21.2a49.44,49.44,0,0,0-47.38-5.34A49.53,49.53,0,0,0,15.86,42.58a49,49,0,0,0-3.73,18.86h0A48.93,48.93,0,0,0,21.2,90ZM98.92,29.38,29.38,98.92A49.32,49.32,0,0,0,98.92,29.38Z"/>
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

    let browser;
    try {
        const puppeteerModule = await import('puppeteer');
        const puppeteer = puppeteerModule.default || puppeteerModule;
        browser = await puppeteer.launch({
            executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        });
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
    } catch (launchErr) {
        console.error("Erro ao iniciar o Puppeteer:", launchErr.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

console.log("Serviço de impressão Mundo Kids iniciado.");
setInterval(processPrintJobs, POLLING_INTERVAL);
