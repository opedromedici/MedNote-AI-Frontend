// MedNote AI - Application Core

document.addEventListener('DOMContentLoaded', async () => {
    // Verifica autenticação — redireciona para login se não autenticado
    const session = await AuthModule.requireAuth();
    if (!session) return;

    // Preenche dados do usuário no sidebar
    const meta = session.user?.user_metadata ?? {};
    const fullName = meta.full_name ?? session.user?.email ?? 'Usuário';
    const specialty = meta.specialty ?? '';
    const avatarName = encodeURIComponent(fullName.replace(/^Dr\.?\s*/i, '').trim() || 'U');

    const elName = document.getElementById('user-name');
    const elSpecialty = document.getElementById('user-specialty');
    const elAvatar = document.getElementById('user-avatar');
    if (elName) elName.textContent = fullName;
    if (elSpecialty) elSpecialty.textContent = specialty;
    if (elAvatar) elAvatar.src = `https://ui-avatars.com/api/?name=${avatarName}&background=10B981&color=fff`;

    // Botão de logout
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            btnLogout.disabled = true;
            btnLogout.innerHTML = '<i class="ph ph-spinner text-base animate-spin"></i> Saindo...';
            await AuthModule.signOut();
            window.location.href = 'login.html';
        });
    }

    // Current state
    const AppState = {
        currentPage: 'record', // 'record', 'templates', 'prompt', 'results'
        recordingStatus: 'idle', // 'idle', 'recording', 'processing', 'done'
        templates: {
            doctor: '',
            patient: ''
        }
    };

    // DOM Elements
    const views = {
        record: document.getElementById('view-record'),
        templates: document.getElementById('view-templates'),
        prompt: document.getElementById('view-prompt'),
        results: document.getElementById('view-results')
    };

    const navLinks = {
        record: document.getElementById('nav-record'),
        templates: document.getElementById('nav-templates'),
        prompt: document.getElementById('nav-prompt')
    };

    // Navigation Logic
    function navigateTo(pageId) {
        if (!views[pageId]) return;

        // Hide all views
        Object.values(views).forEach(view => {
            if (view) {
                view.classList.add('hidden');
                view.classList.remove('fade-in');
            }
        });

        // Show target view
        views[pageId].classList.remove('hidden');
        views[pageId].classList.add('fade-in');

        // Update nav styling
        Object.entries(navLinks).forEach(([key, link]) => {
            if (!link) return;
            if (key === pageId) {
                // Active state
                link.classList.add('bg-zinc-100', 'text-zinc-900');
                link.classList.remove('text-zinc-500', 'hover:bg-zinc-50');
            } else {
                // Inactive state
                link.classList.remove('bg-zinc-100', 'text-zinc-900');
                link.classList.add('text-zinc-500', 'hover:bg-zinc-50');
            }
        });

        AppState.currentPage = pageId;
    }

    // Event Listeners for Navigation
    if (navLinks.record) navLinks.record.addEventListener('click', (e) => { e.preventDefault(); navigateTo('record'); });
    if (navLinks.templates) navLinks.templates.addEventListener('click', (e) => { e.preventDefault(); navigateTo('templates'); });
    if (navLinks.prompt) navLinks.prompt.addEventListener('click', (e) => { e.preventDefault(); navigateTo('prompt'); });

    // Initialize Modules (To be defined in respective files, but called here if needed)
    if (typeof initRecorder === 'function') initRecorder({ navigateTo });
    if (typeof initTemplates === 'function') initTemplates();
    if (typeof initResults === 'function') initResults();
    if (typeof initPrompt === 'function') initPrompt();

    // Set initial view
    navigateTo('record');
});
