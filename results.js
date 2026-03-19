// MedNote AI — Results Module (results.js)

// Armazena o texto puro para cópia e download
let _doctorText  = '';
let _patientText = '';

// ── Utilitários ───────────────────────────────────────────────────────────────

function textToHtml(text) {
    return text
        .split(/\n{2,}/)
        .map(para => {
            const t = para.trim();
            if (!t) return '';
            if (/^#+\s/.test(t))
                return `<h4 class="font-bold text-zinc-900 border-b border-zinc-200 pb-1 mb-2 mt-4">${t.replace(/^#+\s/, '')}</h4>`;
            if (/^\d+\.\s/.test(t) && t.split('\n').length === 1)
                return `<h4 class="font-bold text-zinc-900 border-b border-zinc-200 pb-1 mb-2 mt-4">${t}</h4>`;
            if (t.includes('\n-') || t.startsWith('-')) {
                const items = t.split('\n').filter(l => l.trim())
                    .map(l => `<li>${l.replace(/^[-*]\s*/, '')}</li>`).join('');
                return `<ul class="list-disc pl-5 space-y-1">${items}</ul>`;
            }
            return `<p>${t.replace(/\n/g, '<br>')}</p>`;
        })
        .join('\n');
}

function injectWithFade(element, html) {
    element.innerHTML = '';
    element.classList.add('typing-cursor');
    setTimeout(() => {
        element.classList.remove('typing-cursor');
        element.innerHTML = `<div class="space-y-3">${html}</div>`;
        element.classList.add('fade-in');
    }, 400);
}

// Abre uma nova aba com o documento formatado e aciona o print (salvar como PDF)
function downloadAsPDF(title, rawText) {
    const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${title} — MedNote AI</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', sans-serif;
      font-size: 13px;
      color: #18181b;
      background: #fff;
      padding: 48px 56px;
      max-width: 820px;
      margin: 0 auto;
      line-height: 1.7;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 16px;
      border-bottom: 2px solid #10b981;
      margin-bottom: 28px;
    }
    .logo { display: flex; align-items: center; gap: 8px; }
    .logo-icon {
      width: 28px; height: 28px; border-radius: 50%;
      background: linear-gradient(to bottom, #34d399, #059669);
      display: flex; align-items: center; justify-content: center;
    }
    .logo-icon svg { width: 14px; height: 14px; fill: white; }
    .logo-name { font-size: 15px; font-weight: 600; color: #18181b; }
    .logo-name span { color: #71717a; font-weight: 400; }
    .meta { text-align: right; font-size: 11px; color: #71717a; line-height: 1.5; }
    h1 { font-size: 18px; font-weight: 700; color: #18181b; margin-bottom: 24px; letter-spacing: -0.3px; }
    h4 {
      font-size: 12px; font-weight: 700; color: #18181b;
      text-transform: uppercase; letter-spacing: 0.5px;
      border-bottom: 1px solid #e4e4e7;
      padding-bottom: 4px; margin-top: 20px; margin-bottom: 8px;
    }
    p { margin-bottom: 10px; color: #3f3f46; }
    ul { padding-left: 18px; margin-bottom: 10px; }
    li { margin-bottom: 4px; color: #3f3f46; }
    footer {
      margin-top: 40px; padding-top: 14px; border-top: 1px solid #e4e4e7;
      font-size: 10px; color: #a1a1aa; text-align: center;
    }
    @media print {
      body { padding: 0; }
      @page { margin: 2cm 2.5cm; }
    }
  </style>
</head>
<body>
  <header>
    <div class="logo">
      <div class="logo-icon">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 8h-2V6a5 5 0 0 0-10 0v2H5a1 1 0 0 0-1 1v11a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V9a1 1 0 0 0-1-1zm-8 8a1 1 0 1 1 2 0v2a1 1 0 1 1-2 0v-2zm1-4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM9 6a3 3 0 0 1 6 0v2H9V6z"/>
        </svg>
      </div>
      <div class="logo-name">MedNote <span>AI</span></div>
    </div>
    <div class="meta">
      <div>${date} às ${time}</div>
      <div>Gerado por GPT-4o via MedNote AI</div>
    </div>
  </header>

  <h1>${title}</h1>

  <div id="content">
    ${rawText.split('\n\n').map(p => {
        const t = p.trim();
        if (!t) return '';
        if (/^\d+\.\s/.test(t) && t.split('\n').length === 1) return `<h4>${t}</h4>`;
        if (t.startsWith('-') || t.includes('\n-')) {
            const items = t.split('\n').filter(l => l.trim())
                .map(l => `<li>${l.replace(/^[-*]\s*/, '')}</li>`).join('');
            return `<ul>${items}</ul>`;
        }
        return `<p>${t.replace(/\n/g, '<br>')}</p>`;
    }).join('')}
  </div>

  <footer>MedNote AI · GenLabs · Documento gerado automaticamente — revise antes de utilizar clinicamente.</footer>

  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, '_blank');
    if (win) win.focus();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function copyToClipboard(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
        const icon = btn.querySelector('i');
        const orig = icon.className;
        icon.className = 'ph ph-check';
        btn.classList.add('text-emerald-500');
        setTimeout(() => {
            icon.className = orig;
            btn.classList.remove('text-emerald-500');
        }, 2000);
    });
}

function bindResultButtons() {
    const btnCopyDoctor     = document.getElementById('btn-copy-doctor');
    const btnDownloadDoctor = document.getElementById('btn-download-doctor');
    const btnCopyPatient    = document.getElementById('btn-copy-patient');
    const btnDownloadPatient= document.getElementById('btn-download-patient');
    const btnNewRecord      = document.getElementById('btn-new-record');

    btnCopyDoctor?.addEventListener('click',      () => copyToClipboard(_doctorText, btnCopyDoctor));
    btnDownloadDoctor?.addEventListener('click',  () => downloadAsPDF('Prontuário Médico', _doctorText));
    btnCopyPatient?.addEventListener('click',     () => copyToClipboard(_patientText, btnCopyPatient));
    btnDownloadPatient?.addEventListener('click', () => downloadAsPDF('Resumo do Paciente', _patientText));
    btnNewRecord?.addEventListener('click', () => {
        const inp = document.getElementById('patient-name-input');
        if (inp) inp.value = '';
        if (window.appNavigateTo) window.appNavigateTo('record');
        else location.reload();
    }, { once: true });
}

// ── Renderiza resultados reais (GPT-4o) ───────────────────────────────────────
window.renderRealResults = ({ doctor, patient }) => {
    const doctorEl  = document.getElementById('result-doctor-content');
    const patientEl = document.getElementById('result-patient-content');
    if (!doctorEl) return;

    _doctorText  = doctor;
    _patientText = patient;

    injectWithFade(doctorEl,  textToHtml(doctor));
    setTimeout(() => injectWithFade(patientEl, textToHtml(patient)), 500);

    bindResultButtons();
};

// ── Mock results (dev / fallback) ────────────────────────────────────────────
window.generateMockResults = () => {
    _doctorText = `1. Identificação do Paciente
João da Silva, 45 anos, masculino.

2. Queixa Principal
Dor precordial atípica há 2 semanas.

3. História da Doença Atual
Relata episódios de dor torácica em queimação, retroesternal, sem irradiação, desencadeada aos esforços moderados e aliviada pelo repouso. Nega dispneia, palpitações ou síncope associada.

4. Avaliação Clínica
BEG, eupneico, acianótico. ACV: RCR em 2T, bulhas normofonéticas, sem sopros. FC: 78 bpm, PA: 130/80 mmHg. AR: MV+, sem RA.

5. Hipóteses Diagnósticas
- Angina estável a esclarecer.
- DRGE (Diagnóstico diferencial).

6. Conduta e Prescrições
- Solicitado ECG de repouso, Teste Ergométrico e Ecocardiograma.
- Prescrito AAS 100mg/dia (após almoço).
- Prescrito Rosuvastatina 10mg/dia (noturno).
- Prescrito Pantoprazol 40mg (jejum) como teste terapêutico.`;

    _patientText = `Motivo da sua consulta
Você nos procurou por causa de uma dor no peito em queimação que tem acontecido nas últimas 2 semanas, principalmente quando faz algum esforço.

Seus Medicamentos
- AAS 100mg: Tomar 1 comprimido por dia, logo após o almoço.
- Rosuvastatina 10mg: Tomar 1 comprimido por dia, à noite.
- Pantoprazol 40mg: Tomar 1 comprimido por dia, em jejum (30min antes do café).

Próximos Passos
Precisamos fazer alguns exames para ter certeza da causa da dor: um Eletrocardiograma, um Ecocardiograma e um Teste de Esteira (Ergométrico).

Sinais de Alerta
Procure a emergência imediatamente se a dor no peito for muito forte, vier acompanhada de suor frio, falta de ar ou se não passar com o repouso.`;

    const doctorEl  = document.getElementById('result-doctor-content');
    const patientEl = document.getElementById('result-patient-content');
    if (!doctorEl) return;

    injectWithFade(doctorEl,  textToHtml(_doctorText));
    setTimeout(() => injectWithFade(patientEl, textToHtml(_patientText)), 500);

    bindResultButtons();
};

function initResults() {}
