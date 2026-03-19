// MedNote AI — Consultas Module (consultas.js)
// Carrega e renderiza o histórico de consultas do Supabase.

let _allConsultas = [];

function initConsultas() {
    const searchInput = document.getElementById('consultas-search');
    if (!searchInput) return;

    let debounceTimer;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const q = searchInput.value.trim();
            renderConsultas(_allConsultas.filter(c =>
                !q || (c.patient_name || '').toLowerCase().includes(q.toLowerCase())
            ));
        }, 300);
    });
}

async function loadConsultasList() {
    const list = document.getElementById('consultas-list');
    if (!list) return;

    list.innerHTML = `
        <div class="flex items-center justify-center py-16 text-zinc-400">
            <div class="flex flex-col items-center gap-3">
                <div class="processing-spinner"></div>
                <span class="text-sm">Carregando consultas...</span>
            </div>
        </div>`;

    if (!window.DB) {
        list.innerHTML = renderEmpty('Módulo de banco de dados não disponível.');
        return;
    }

    try {
        _allConsultas = await DB.listConsultas();
        renderConsultas(_allConsultas);
    } catch (err) {
        list.innerHTML = renderEmpty('Erro ao carregar consultas. Tente novamente.');
        console.warn('[Consultas]', err);
    }
}

function renderConsultas(consultas) {
    const list = document.getElementById('consultas-list');
    if (!list) return;

    // Limpa o input de busca do estado do filtro visual se não há resultados
    if (consultas.length === 0) {
        list.innerHTML = renderEmpty('Nenhuma consulta encontrada.');
        return;
    }

    list.innerHTML = consultas.map((c, idx) => renderCard(c, idx)).join('');

    // Bind toggle de cada card
    list.querySelectorAll('.consulta-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const body = document.getElementById('body-' + btn.dataset.id);
            const icon = btn.querySelector('i');
            if (!body) return;
            const isOpen = !body.classList.contains('hidden');
            body.classList.toggle('hidden', isOpen);
            icon.className = isOpen ? 'ph ph-caret-down text-base' : 'ph ph-caret-up text-base';
        });
    });

    // Bind botões de copiar
    list.querySelectorAll('.btn-copy-result').forEach(btn => {
        btn.addEventListener('click', () => {
            const text = btn.dataset.text;
            if (!text) return;
            navigator.clipboard.writeText(text).then(() => {
                const orig = btn.innerHTML;
                btn.innerHTML = '<i class="ph ph-check text-xs"></i> Copiado';
                btn.classList.add('text-emerald-600');
                setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('text-emerald-600'); }, 2000);
            });
        });
    });
}

function renderCard(c, idx) {
    const name       = c.patient_name || 'Paciente sem nome';
    const date       = new Date(c.created_at);
    const dateStr    = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr    = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const duration   = c.duracao_segundos > 0 ? formatDuration(c.duracao_segundos) : null;
    const initials   = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

    const hasResults = c.resultado_medico || c.resultado_paciente;

    return `
    <div class="glass-card bg-white/80 rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden">
        <!-- Card Header -->
        <button class="consulta-toggle w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-zinc-50/50 transition-colors" data-id="${c.id}">
            <!-- Avatar -->
            <div class="w-10 h-10 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm">
                ${initials || '<i class="ph ph-user text-base"></i>'}
            </div>
            <!-- Info -->
            <div class="flex-grow min-w-0">
                <p class="text-sm font-semibold text-zinc-900 truncate">${escapeHtml(name)}</p>
                <div class="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span class="text-[11px] text-zinc-400 flex items-center gap-1">
                        <i class="ph ph-calendar-blank"></i> ${dateStr} às ${timeStr}
                    </span>
                    ${duration ? `<span class="text-[11px] text-zinc-400 flex items-center gap-1"><i class="ph ph-timer"></i> ${duration}</span>` : ''}
                </div>
            </div>
            <!-- Chevron -->
            <i class="ph ph-caret-down text-base text-zinc-400 flex-shrink-0"></i>
        </button>

        <!-- Card Body (collapsed by default) -->
        <div id="body-${c.id}" class="hidden border-t border-zinc-100">
            ${hasResults ? `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-zinc-100">
                <!-- Prontuário Médico -->
                <div class="p-6">
                    <div class="flex items-center justify-between mb-3">
                        <h4 class="text-xs font-bold text-zinc-500 uppercase tracking-widest">Prontuário Médico</h4>
                        ${c.resultado_medico ? `<button class="btn-copy-result text-[11px] text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 transition-colors" data-text="${escapeAttr(c.resultado_medico)}"><i class="ph ph-copy text-xs"></i> Copiar</button>` : ''}
                    </div>
                    <div class="text-sm text-zinc-700 leading-relaxed max-h-72 overflow-y-auto custom-scroll pr-1 font-serif">
                        ${c.resultado_medico ? formatResultText(c.resultado_medico) : '<span class="text-zinc-400 italic">Sem resultado registrado.</span>'}
                    </div>
                </div>
                <!-- Resumo Paciente -->
                <div class="p-6">
                    <div class="flex items-center justify-between mb-3">
                        <h4 class="text-xs font-bold text-zinc-500 uppercase tracking-widest">Resumo do Paciente</h4>
                        ${c.resultado_paciente ? `<button class="btn-copy-result text-[11px] text-zinc-600 hover:text-zinc-900 font-medium flex items-center gap-1 transition-colors" data-text="${escapeAttr(c.resultado_paciente)}"><i class="ph ph-copy text-xs"></i> Copiar</button>` : ''}
                    </div>
                    <div class="text-sm text-zinc-700 leading-relaxed max-h-72 overflow-y-auto custom-scroll pr-1">
                        ${c.resultado_paciente ? formatResultText(c.resultado_paciente) : '<span class="text-zinc-400 italic">Sem resultado registrado.</span>'}
                    </div>
                </div>
            </div>` : `
            <div class="px-6 py-8 text-center text-zinc-400">
                <i class="ph ph-file-dashed text-3xl mb-2 block"></i>
                <p class="text-sm">Resumos ainda não gerados para esta consulta.</p>
            </div>`}
        </div>
    </div>`;
}

function renderEmpty(msg) {
    return `
        <div class="flex flex-col items-center justify-center py-20 text-zinc-400">
            <i class="ph ph-clipboard-text text-5xl mb-4 text-zinc-200"></i>
            <p class="text-sm font-medium">${msg}</p>
            <p class="text-xs mt-1 text-zinc-300">As consultas finalizadas aparecerão aqui.</p>
        </div>`;
}

function formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}min${s > 0 ? ` ${s}s` : ''}` : `${s}s`;
}

function formatResultText(text) {
    if (!text) return '';
    return text
        .split(/\n{2,}/)
        .map(para => {
            const t = para.trim();
            if (!t) return '';
            if (/^#+\s/.test(t) || /^\d+\.\s/.test(t))
                return `<p class="font-semibold text-zinc-800 mt-3 mb-1">${escapeHtml(t.replace(/^#+\s/, ''))}</p>`;
            if (t.startsWith('-') || t.includes('\n-')) {
                const items = t.split('\n').filter(l => l.trim())
                    .map(l => `<li>${escapeHtml(l.replace(/^[-*]\s*/, ''))}</li>`).join('');
                return `<ul class="list-disc pl-4 space-y-0.5 text-zinc-600">${items}</ul>`;
            }
            return `<p class="text-zinc-700">${escapeHtml(t).replace(/\n/g, '<br>')}</p>`;
        })
        .join('');
}

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
    return String(str ?? '').replace(/"/g, '&quot;').replace(/\n/g, '&#10;');
}

window.loadConsultasList = loadConsultasList;
