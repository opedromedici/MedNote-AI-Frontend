// MedNote AI - Templates Management Module (templates.js)

function initTemplates() {
    const el = {
        btnSave: document.getElementById('btn-save-templates'),
        txtDoctor: document.getElementById('template-doctor'),
        txtPatient: document.getElementById('template-patient')
    };

    if (!el.btnSave) return;

    // Default Templates implementation based on PRD 17.9
    const defaultDoctorTemplate = `Formato Clínico Estruturado:

1. Queixa Principal:
2. História da Doença Atual:
3. Avaliação Clínica:
4. Hipóteses Diagnósticas:
5. Prescrições & Conduta:
6. Plano de Acompanhamento:

(Linguagem 100% técnica/médica. Não omita detalhes.)`;

    const defaultPatientTemplate = `Resumo Orientativo para o Paciente:

1. O que foi identificado hoje:
2. Explicação simples da condição:
3. O que deve ser feito (Plano de ação):
4. Como tomar os medicamentos:
5. Próximos passos e Sinais de alerta:

(Usar linguagem acolhedora, clara e tom empático, sem jargões.)`;

    // Load from LocalStorage or inject Defaults
    function loadTemplates() {
        const savedDoctor = localStorage.getItem('mednote_template_doctor');
        const savedPatient = localStorage.getItem('mednote_template_patient');

        el.txtDoctor.value = savedDoctor || defaultDoctorTemplate;
        el.txtPatient.value = savedPatient || defaultPatientTemplate;
    }

    // Save Action
    el.btnSave.addEventListener('click', () => {
        // Visual feedback
        const originalText = el.btnSave.innerHTML;
        el.btnSave.innerHTML = `<i class="ph ph-check"></i> Salvo!`;
        el.btnSave.classList.replace('bg-zinc-900', 'bg-emerald-600');

        // Persist
        localStorage.setItem('mednote_template_doctor', el.txtDoctor.value);
        localStorage.setItem('mednote_template_patient', el.txtPatient.value);

        setTimeout(() => {
            el.btnSave.innerHTML = originalText;
            el.btnSave.classList.replace('bg-emerald-600', 'bg-zinc-900');
        }, 2000);
    });

    // Initialize module by loading existing data
    loadTemplates();
}
