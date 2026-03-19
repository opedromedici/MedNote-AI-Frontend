// MedNote AI - Templates Management Module (templates.js)
// Carrega do Supabase (profiles) na inicialização; salva em localStorage + Supabase.

function initTemplates() {
    const el = {
        btnSave:    document.getElementById('btn-save-templates'),
        txtDoctor:  document.getElementById('template-doctor'),
        txtPatient: document.getElementById('template-patient')
    };

    if (!el.btnSave) return;

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

    // Carrega templates: localStorage imediato, depois sincroniza com Supabase
    async function loadTemplates() {
        // 1. Mostra localStorage imediatamente (sem espera)
        const cachedDoctor  = localStorage.getItem('mednote_template_doctor');
        const cachedPatient = localStorage.getItem('mednote_template_patient');
        el.txtDoctor.value  = cachedDoctor  || defaultDoctorTemplate;
        el.txtPatient.value = cachedPatient || defaultPatientTemplate;

        // 2. Tenta carregar do Supabase e atualiza se houver dados mais recentes
        if (!window.DB) return;
        try {
            const profile = await DB.loadProfile();
            if (profile?.template_medico) {
                el.txtDoctor.value = profile.template_medico;
                localStorage.setItem('mednote_template_doctor', profile.template_medico);
            }
            if (profile?.template_paciente) {
                el.txtPatient.value = profile.template_paciente;
                localStorage.setItem('mednote_template_patient', profile.template_paciente);
            }
        } catch (_) {}
    }

    // Salva em localStorage e sincroniza com Supabase
    el.btnSave.addEventListener('click', () => {
        const originalText = el.btnSave.innerHTML;
        el.btnSave.innerHTML = `<i class="ph ph-check"></i> Salvo!`;
        el.btnSave.classList.replace('bg-zinc-900', 'bg-emerald-600');

        // localStorage (imediato)
        localStorage.setItem('mednote_template_doctor',  el.txtDoctor.value);
        localStorage.setItem('mednote_template_patient', el.txtPatient.value);

        // Supabase (background)
        if (window.DB) {
            DB.saveProfile({
                template_medico:   el.txtDoctor.value,
                template_paciente: el.txtPatient.value,
            }).catch(() => {});
        }

        setTimeout(() => {
            el.btnSave.innerHTML = originalText;
            el.btnSave.classList.replace('bg-emerald-600', 'bg-zinc-900');
        }, 2000);
    });

    loadTemplates();
}
