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
            .status-icon { width: 7.5mm; height: 7.5mm; font-size: 18pt; display: flex; align-items: center; justify-content: center; }
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
                ${job.has_allergy ? '<span class="status-icon">⚠️</span>' : ''}
                ${!job.image_use_allowed ? '<span class="status-icon">🚫📷</span>' : ''}
                ${job.is_birthday ? '<span class="status-icon">🎂</span>' : ''}
                ${job.student_type === 'Visitante' ? '<span class="status-icon">★</span>' : ''}
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
