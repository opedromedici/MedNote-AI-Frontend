// MedNote AI - Results Module (results.js)

// Expose globally so recorder.js can call it when processing ends
window.generateMockResults = () => {
    const el = {
        doctorContent: document.getElementById('result-doctor-content'),
        patientContent: document.getElementById('result-patient-content'),
        btnNewRecord: document.getElementById('btn-new-record')
    };

    if (!el.doctorContent) return;

    // Based on PRD structures
    const mockDoctorResult = `
<div class="space-y-4">
    <div>
        <h4 class="font-bold text-zinc-900 border-b border-zinc-200 pb-1 mb-2">1. Identificação do Paciente</h4>
        <p>João da Silva, 45 anos, masculino.</p>
    </div>
    <div>
        <h4 class="font-bold text-zinc-900 border-b border-zinc-200 pb-1 mb-2">2. Queixa Principal</h4>
        <p>Dor precordial atípica há 2 semanas.</p>
    </div>
    <div>
        <h4 class="font-bold text-zinc-900 border-b border-zinc-200 pb-1 mb-2">3. História da Doença Atual</h4>
        <p>Relata episódios de dor torácica em queimação, retroesternal, sem irradiação, desencadeada a os esforços moderados e aliviada pelo repouso. Nega dispneia, palpitações ou síncope associada.</p>
    </div>
    <div>
        <h4 class="font-bold text-zinc-900 border-b border-zinc-200 pb-1 mb-2">4. Avaliação Clínica</h4>
        <p>Ao exame físico: BEG, eupneico, acianótico. ACV: RCR em 2T, bulhas normofonéticas, sem sopros. FC: 78 bpm, PA: 130/80 mmHg. AR: MV+, sem RA.</p>
    </div>
    <div>
        <h4 class="font-bold text-zinc-900 border-b border-zinc-200 pb-1 mb-2">5. Hipóteses Diagnósticas</h4>
        <p>1. Angina estável a esclarecer.<br>2. DRGE (Diagnóstico diferencial).</p>
    </div>
    <div>
        <h4 class="font-bold text-zinc-900 border-b border-zinc-200 pb-1 mb-2">6. Conduta e Prescrições</h4>
        <ul class="list-disc pl-5 mt-1 space-y-1">
            <li>Solicitado ECG de repouso, Teste Ergométrico e Ecocardiograma.</li>
            <li>Prescrito AAS 100mg/dia (após almoço).</li>
            <li>Prescrito Rosuvastatina 10mg/dia (noturno).</li>
            <li>Prescrito Pantoprazol 40mg (jejum) como teste terapêutico.</li>
        </ul>
    </div>
</div>
`;

    const mockPatientResult = `
<div class="space-y-5">
    <div>
        <h4 class="font-semibold text-emerald-600 text-lg mb-1">Motivo da sua consulta</h4>
        <p>Você nos procurou por causa de uma dor no peito em queimação que tem acontecido nas últimas 2 semanas, principalmente quando faz algum esforço.</p>
    </div>
    
    <div class="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
        <h4 class="font-semibold text-emerald-600 text-lg mb-2 flex items-center gap-2">
            <i class="ph-fill ph-pill"></i> Seus Medicamentos
        </h4>
        <ul class="space-y-3">
            <li class="flex flex-col">
                <span class="font-bold text-zinc-800">AAS 100mg</span>
                <span class="text-sm">Tomar 1 comprimido por dia, logo após o almoço.</span>
            </li>
            <li class="flex flex-col">
                <span class="font-bold text-zinc-800">Rosuvastatina 10mg</span>
                <span class="text-sm">Tomar 1 comprimido por dia, à noite.</span>
            </li>
            <li class="flex flex-col">
                <span class="font-bold text-zinc-800">Pantoprazol 40mg</span>
                <span class="text-sm">Tomar 1 comprimido por dia, em jejum (30min antes do café).</span>
            </li>
        </ul>
    </div>

    <div>
        <h4 class="font-semibold text-emerald-600 text-lg mb-1">Próximos Passos</h4>
        <p>Precisamos fazer alguns exames para ter certeza da causa da dor: um <strong>Eletrocardiograma</strong>, um <strong>Ecocardiograma</strong> e um <strong>Teste de Esteira (Ergométrico)</strong>.</p>
    </div>

    <div class="bg-orange-50/50 p-4 rounded-xl border border-orange-100">
        <h4 class="font-semibold text-orange-600 text-lg mb-1 flex items-center gap-2">
            <i class="ph-fill ph-warning-circle"></i> Sinais de Alerta
        </h4>
        <p class="text-sm">Procure a emergência imediatamente se a dor no peito for muito forte, vier acompanhada de suor frio, falta de ar ou se não passar com o repouso.</p>
    </div>
</div>
`;

    // Typewriter effect simulation
    const typeWriter = (element, htmlContent) => {
        element.innerHTML = '';
        element.classList.add('typing-cursor');

        // Em um app real, o texto vindo da IA é streamado em texto plano ou Markdown convertido.
        // Como aqui injetamos HTML pronto por conta do visual, vamos injetar direto para manter 
        // a formação visual intacta e rápida para o escopo do frontend.

        setTimeout(() => {
            element.classList.remove('typing-cursor');
            element.innerHTML = htmlContent;
            element.classList.add('fade-in');
        }, 500); // delay mock
    }

    typeWriter(el.doctorContent, mockDoctorResult);
    setTimeout(() => {
        typeWriter(el.patientContent, mockPatientResult);
    }, 600);

    // New Record Action
    el.btnNewRecord.addEventListener('click', () => {
        // Return to recording state via global app or simple reload
        location.reload();
    });
};

function initResults() {
    // Only bind static listeners here if necessary, dynamics happen inside generateMockResults
}
