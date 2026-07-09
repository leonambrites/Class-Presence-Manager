import { Student, StudentType } from '../types';
import { isBirthdayThisWeek } from '../utils';

export function printTwoWayLabel(student: Student, dailyCode: number | undefined) {
    const codeStr = dailyCode !== undefined ? String(dailyCode).padStart(3, '0') : '---';
    const dateStr = new Date().toLocaleDateString('pt-BR');
    const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Retrieve the official compiled Mundo Kids logo path from the link elements
    const faviconLink = document.querySelector('link[sizes="96x96"]') as HTMLLinkElement;
    const logoSrc = faviconLink ? faviconLink.href : './public/favicon-96x96.png';

    // Active status indicators mapping
    const showAllergy = !!student.hasAllergy;
    const showNoImage = student.imageUseAllowed === false;
    const showBirthday = isBirthdayThisWeek(student.birthday);
    
    // Auto-detect PCD/accessibility text inside allergy description
    const showSpecial = !!student.allergyDescription && (
        student.allergyDescription.toLowerCase().includes('pcd') || 
        student.allergyDescription.toLowerCase().includes('autis') || 
        student.allergyDescription.toLowerCase().includes('cadeir') ||
        student.allergyDescription.toLowerCase().includes('defic') ||
        student.allergyDescription.toLowerCase().includes('especial')
    );
    
    const showVisitor = student.type === StudentType.Visitante;

    // Create an invisible iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) return;

    const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <style>
            @page {
                size: 60mm 30mm;
                margin: 0;
            }
            html, body {
                margin: 0;
                padding: 0;
                width: 60mm;
                height: 30mm;
                background-color: #fff;
                font-family: system-ui, -apple-system, sans-serif;
            }
            .etiqueta-wrapper {
                width: 60mm;
                height: 30mm;
                box-sizing: border-box;
                padding: 2.2mm 3.2mm;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                border: 1px solid #000;
                border-radius: 4px;
                page-break-after: always;
                break-after: page;
            }
            .etiqueta-header {
                display: flex;
                align-items: center;
                gap: 1.2mm;
                height: 4mm;
            }
            .etiqueta-logo {
                width: 4.2mm;
                height: 4.2mm;
                object-fit: contain;
            }
            .etiqueta-brand {
                font-size: 8.5pt;
                font-weight: 900;
                color: #000;
                text-transform: uppercase;
                letter-spacing: -0.2px;
                line-height: 1;
            }
            .child-name {
                font-size: 13.5pt;
                font-weight: 850;
                color: #000;
                text-transform: uppercase;
                letter-spacing: -0.4px;
                margin: 0.8mm 0 0 0;
                line-height: 1.1;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                width: 100%;
            }
            .code-status-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                height: 12mm;
                margin-top: 0.5mm;
            }
            .security-code {
                font-size: 34pt;
                font-weight: 900;
                color: #000;
                line-height: 1;
                letter-spacing: -1px;
                margin: 0;
            }
            .status-indicators {
                display: flex;
                align-items: center;
                gap: 1.5mm;
            }
            .status-icon {
                width: 4.8mm;
                height: 4.8mm;
                color: #000;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .status-icon svg {
                width: 100%;
                height: 100%;
            }
            .divider {
                height: 0.3mm;
                background-color: #000;
                width: 100%;
                margin-top: 0.8mm;
                margin-bottom: 0.8mm;
            }
            .footer-row {
                display: flex;
                justify-content: space-between;
                font-size: 6.8pt;
                font-weight: 700;
                color: #000;
                text-transform: uppercase;
                letter-spacing: 0.2px;
                line-height: 1;
                align-items: center;
            }
        </style>
    </head>
    <body>

        <!-- VIA 1: CRIAÇÃO / CONTROLE CRIANÇA -->
        <div class="etiqueta-wrapper">
            <div class="etiqueta-header">
                <img class="etiqueta-logo" src="${logoSrc}" alt="Logo">
                <div class="etiqueta-brand">Mundo Kids</div>
            </div>

            <h2 class="child-name">${student.name}</h2>
            
            <div class="code-status-row">
                <span class="security-code">${codeStr}</span>
                <div class="status-indicators">
                    <!-- Restrição Alimentar -->
                    ${showAllergy ? `
                    <div class="status-icon" title="Restrição Alimentar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                    </div>` : ''}

                    <!-- Sem Autorização de Imagem -->
                    ${showNoImage ? `
                    <div class="status-icon" title="Sem Autorização de Imagem">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="2" y1="2" x2="22" y2="22"/>
                            <path d="M7 21h10a2 2 0 0 0 2-2V9.4a2 2 0 0 0-.58-1.42l-2.42-2.4A2 2 0 0 0 14.58 5H13m-3.42.58L8.4 6.8H7a2 2 0 0 0-2 2v10.2A2 2 0 0 0 7 21Z"/>
                            <circle cx="12" cy="13" r="3"/>
                        </svg>
                    </div>` : ''}

                    <!-- Aniversariante -->
                    ${showBirthday ? `
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
                    ${showVisitor ? `
                    <div class="status-icon" title="Visitante">
                        <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                    </div>` : ''}
                </div>
            </div>

            <div class="divider"></div>

            <div class="footer-row">
                <span>${student.class}</span>
                <span>${dateStr} ${timeStr}</span>
            </div>
        </div>

        <!-- VIA 2: VIA DO RESPONSÁVEL / RETIRADA -->
        <div class="etiqueta-wrapper" style="page-break-after: avoid; break-after: avoid;">
            <div class="etiqueta-header">
                <img class="etiqueta-logo" src="${logoSrc}" alt="Logo">
                <div class="etiqueta-brand">Mundo Kids</div>
            </div>

            <h2 class="child-name" style="font-size: 11pt; font-weight: 700;">VIA DO RESPONSÁVEL</h2>
            
            <div class="code-status-row">
                <span class="security-code">${codeStr}</span>
                <span style="font-size: 7.5pt; font-weight: 800; text-align: right; max-width: 32mm; line-height: 1.2;">
                    APRESENTE ESTA VIA PARA A RETIRADA
                </span>
            </div>

            <div class="divider"></div>

            <div class="footer-row">
                <span style="max-width: 30mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${student.name}</span>
                <span>${dateStr} ${timeStr}</span>
            </div>
        </div>

        <script>
            window.onload = function() {
                window.focus();
                window.print();
                setTimeout(function() {
                    window.parent.document.body.removeChild(window.frameElement);
                }, 1200);
            };
        </script>
    </body>
    </html>
    `;

    doc.open();
    doc.write(html);
    doc.close();
}
