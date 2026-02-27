// MedNote AI - Application Core

document.addEventListener('DOMContentLoaded', () => {
    // Current state
    const AppState = {
        currentPage: 'record', // 'record', 'templates', 'results'
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
        results: document.getElementById('view-results')
    };

    const navLinks = {
        record: document.getElementById('nav-record'),
        templates: document.getElementById('nav-templates')
        // Results is usually reached via flow, but could be added
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

    // Initialize Modules (To be defined in respective files, but called here if needed)
    if (typeof initRecorder === 'function') initRecorder({ navigateTo });
    if (typeof initTemplates === 'function') initTemplates();
    if (typeof initResults === 'function') initResults();

    // Set initial view
    navigateTo('record');
});
