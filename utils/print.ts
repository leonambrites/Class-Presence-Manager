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
                size: 62mm 100mm;
                margin: 0;
            }
            html, body {
                margin: 0;
                padding: 0;
                width: 62mm;
                height: 100mm;
                background-color: #fff;
                font-family: system-ui, -apple-system, sans-serif;
            }
            .etiqueta-wrapper {
                width: 62mm;
                height: 100mm;
                box-sizing: border-box;
                padding: 4mm 4.5mm;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                border: 2px solid #000;
                border-radius: 6px;
                page-break-after: always;
                break-after: page;
                overflow: hidden;
            }
            .etiqueta-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                height: 6mm;
            }
            .etiqueta-logo-box {
                display: flex;
                align-items: center;
                gap: 1.5mm;
            }
            .etiqueta-logo {
                width: 5mm;
                height: 5mm;
                object-fit: contain;
            }
            .etiqueta-brand {
                font-size: 9.5pt;
                font-weight: 900;
                color: #000;
                text-transform: uppercase;
                letter-spacing: -0.2px;
                line-height: 1;
            }
            .etiqueta-time {
                font-size: 7pt;
                font-weight: 700;
                color: #000;
                text-align: right;
            }
            
            .divider {
                height: 0.5mm;
                background-color: #000;
                width: 100%;
                margin-top: 1mm;
                margin-bottom: 1mm;
            }
            
            .name-container {
                height: 16mm;
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
                overflow: hidden;
                margin-top: 1mm;
            }
            .child-name {
                font-size: 16pt; /* Base font size, will shrink if needed */
                font-weight: 850;
                color: #000;
                text-transform: uppercase;
                letter-spacing: -0.3px;
                margin: 0;
                line-height: 1.1;
                word-break: break-word;
                width: 100%;
            }

            .code-container {
                display: flex;
                align-items: center;
                justify-content: center;
                height: 24mm;
                margin-top: 1mm;
            }
            .security-code {
                font-size: 52pt;
                font-weight: 950;
                color: #000;
                line-height: 1;
                letter-spacing: -1px;
            }
            
            .status-indicators {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 3mm;
                height: 8mm;
                margin-top: 1mm;
            }
            .status-icon {
                width: 7.5mm;
                height: 7.5mm;
                color: #000;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .status-icon svg {
                width: 100%;
                height: 100%;
            }
            
            .footer-info {
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                text-align: center;
                height: 20mm;
                margin-top: 1mm;
            }
            
            .info-class {
                font-size: 11pt;
                font-weight: 800;
                text-transform: uppercase;
                color: #000;
                line-height: 1.15;
            }
            .info-allergy-desc {
                font-size: 7.5pt;
                font-weight: 750;
                text-transform: uppercase;
                color: #000;
                margin-top: 1mm;
                line-height: 1.2;
                border: 1.5px solid #000;
                padding: 1mm 2mm;
                border-radius: 4px;
                width: 100%;
                box-sizing: border-box;
                word-break: break-word;
                overflow: hidden;
                max-height: 10.5mm;
            }

            /* Via 2 Specific Styles */
            .via2-banner {
                font-size: 11pt;
                font-weight: 900;
                text-align: center;
                background-color: #000;
                color: #fff;
                width: 100%;
                padding: 1.5mm 0;
                border-radius: 4px;
                letter-spacing: 0.5px;
                text-transform: uppercase;
                margin-top: 1mm;
            }
            .via2-instructions {
                font-size: 9.5pt;
                font-weight: 850;
                text-align: center;
                line-height: 1.25;
                text-transform: uppercase;
                margin-top: 1.5mm;
                width: 100%;
            }
        </style>
    </head>
    <body>

        <!-- VIA 1: CRIAÇÃO / CONTROLE CRIANÇA -->
        <div class="etiqueta-wrapper">
            <div class="etiqueta-header">
                <div class="etiqueta-logo-box">
                    <img class="etiqueta-logo" src="${logoSrc}" alt="Logo">
                    <div class="etiqueta-brand">Mundo Kids</div>
                </div>
                <div class="etiqueta-time">${dateStr} ${timeStr}</div>
            </div>

            <div class="divider"></div>

            <div class="name-container">
                <h2 class="child-name" id="name-via-1">${student.name}</h2>
            </div>

            <div class="code-container">
                <span class="security-code">${codeStr}</span>
            </div>

            <div class="status-indicators">
                <!-- Restrição Alimentar -->
                ${showAllergy ? `
                <div class="status-icon" title="Restrição Alimentar">
                    <svg viewBox="0 0 122.88 122.88">
                        <path fill="#fff" d="M21.2,32.93,90,101.68A49.42,49.42,0,0,1,42.58,107,49.25,49.25,0,0,1,12.13,61.44h0A49.12,49.12,0,0,1,21.2,32.93ZM98.92,93.5,29.38,24A49.32,49.32,0,0,1,98.92,93.5Z"/>
                        <path fill="#fff" d="M98.92,29.38,29.39,98.92A49.31,49.31,0,0,0,98.92,29.38ZM21.2,90,90,21.2a49.24,49.24,0,0,0-63.38,5.37A49,49,0,0,0,12.13,61.44h0A49.12,49.12,0,0,0,21.2,90Z"/>
                        <path fill="currentColor" fill-rule="evenodd" d="M51.84,58.25c3.14-2.15,4.73-5,4.46-11.39V30.3c0-2.32-4.23-2.59-4.43,0l-.16,13.42a1.89,1.89,0,0,1-3.77,0l.16-13.91c0-2.48-4.06-2.71-4.06,0,0,3.86-.16,10-.16,13.88a1.84,1.84,0,0,1,0,.33,1.64,1.64,0,1,1-3.28,0,1.86,1.86,0,0,1,0-.33l.16-13.78a2.26,2.26,0,0,0-3.56-1.67c-1.49,1-1.18,2.86-1.25,4.47l-.51,15.83c.08,4.6,1.29,8.34,4.89,9.93a9.17,9.17,0,0,0,2.19.57L41.35,90.89V91a4.06,4.06,0,0,0,4,4.07h.5a4.56,4.56,0,0,0,4.49-4.55.53.53,0,0,0,0-.13L49.24,59a6.75,6.75,0,0,0,2.6-.77Zm19.38,31.5-.07-27.92C59,54.81,62.88,27.75,75,28c14.79.16,16.54,30.48,3.82,33.86l.92,28.07c.18,6.59-8.57,7.2-8.59-.15Z"/>
                        <path fill="currentColor" d="M61.44,122.88a61.31,61.31,0,1,1,23.49-4.66,61.29,61.29,0,0,1-23.49,4.66ZM21.2,90,90,21.2a49.44,49.44,0,0,0-47.38-5.34A49.53,49.53,0,0,0,15.86,42.58a49,49,0,0,0-3.73,18.86h0A48.93,48.93,0,0,0,21.2,90ZM98.92,29.38,29.38,98.92A49.32,49.32,0,0,0,98.92,29.38Z"/>
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

            <div class="divider"></div>

            <div class="footer-info">
                <div class="info-class" id="class-container-1">
                    <span id="class-via-1">TURMA: ${student.class}</span>
                </div>
                ${student.hasAllergy && student.allergyDescription ? `
                <div class="info-allergy-desc" id="allergy-container-1">
                    <span id="allergy-via-1">${student.allergyDescription}</span>
                </div>
                ` : ''}
            </div>
        </div>

        <!-- VIA 2: VIA DO RESPONSÁVEL / RETIRADA -->
        <div class="etiqueta-wrapper" style="page-break-after: avoid; break-after: avoid;">
            <div class="etiqueta-header">
                <div class="etiqueta-logo-box">
                    <img class="etiqueta-logo" src="${logoSrc}" alt="Logo">
                    <div class="etiqueta-brand">Mundo Kids</div>
                </div>
                <div class="etiqueta-time">${dateStr} ${timeStr}</div>
            </div>

            <div class="divider"></div>

            <div class="via2-banner">VIA DO RESPONSÁVEL</div>

            <div class="code-container">
                <span class="security-code">${codeStr}</span>
            </div>

            <div class="name-container" style="height: 12mm;">
                <h2 class="child-name" id="name-via-2" style="font-size: 13pt;">Criança: ${student.name}</h2>
            </div>

            <div class="divider"></div>

            <div class="footer-info" style="height: 15mm;">
                <div class="via2-instructions" id="instruction-container-2">
                    <span id="instruction-via-2">APRESENTE ESTA VIA PARA A RETIRADA DO ALUNO</span>
                </div>
            </div>
        </div>

        <script>
            // JS Auto-Fitting Engine for Dynamic Thermal Labels
            function autoFit(element, parent, isSingleLine = false) {
                if (!element || !parent) return;
                
                let fontSize = parseFloat(window.getComputedStyle(element).fontSize);
                
                const hasOverflow = () => {
                    if (isSingleLine) {
                        return element.scrollWidth > parent.clientWidth;
                    }
                    return element.scrollHeight > parent.clientHeight || element.scrollWidth > parent.clientWidth;
                };

                // Gradually decrease font size until the text fits the container safely
                while (hasOverflow() && fontSize > 6) {
                    fontSize -= 0.4;
                    element.style.fontSize = fontSize + 'px';
                }
            }

            window.onload = function() {
                // 1. Auto fit child name in Via 1
                const name1 = document.getElementById('name-via-1');
                if (name1) autoFit(name1, name1.parentElement, false);

                // 2. Auto fit child name in Via 2
                const name2 = document.getElementById('name-via-2');
                if (name2) autoFit(name2, name2.parentElement, false);

                // 3. Auto fit class name in Via 1
                const class1 = document.getElementById('class-via-1');
                if (class1) autoFit(class1, class1.parentElement, true);

                // 4. Auto fit allergy details in Via 1
                const allergy1 = document.getElementById('allergy-via-1');
                if (allergy1) autoFit(allergy1, allergy1.parentElement, false);

                // 5. Auto fit instruction text in Via 2
                const instr2 = document.getElementById('instruction-via-2');
                if (instr2) autoFit(instr2, instr2.parentElement, false);

                // Disparar impressão
                window.focus();
                window.print();
                
                setTimeout(function() {
                    window.parent.document.body.removeChild(window.frameElement);
                }, 1500);
            };
        </script>
    </body>
    `;

    doc.open();
    doc.write(html);
    doc.close();
}
