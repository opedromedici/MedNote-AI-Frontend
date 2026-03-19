// MedNote AI - Supabase Authentication Module
// =================================================
// CONFIGURE SUAS CREDENCIAIS DO SUPABASE ABAIXO:
const SUPABASE_URL = 'https://ccqjxfoxbfmhrygpsrkt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjcWp4Zm94YmZtaHJ5Z3Bzcmt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTczNjYsImV4cCI6MjA4OTQ5MzM2Nn0.3B_38wLiD0-5Z75-IF-tTZTVerEfB12i-AN2mYefQ1U';
// =================================================

// Expõe credenciais para uso em outros módulos
window.__SUPABASE_URL__ = SUPABASE_URL;
window.__SUPABASE_ANON_KEY__ = SUPABASE_ANON_KEY;

// Injeta o SDK do Supabase
(function loadSupabaseSDK() {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.async = false;
    document.head.insertBefore(script, document.head.firstChild);
})();

// AuthModule - singleton com todas as operações de autenticação
const AuthModule = (() => {
    let _client = null;

    async function ensureClient() {
        return new Promise((resolve) => {
            function check() {
                if (window.supabase) {
                    if (!_client) {
                        _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                    }
                    resolve(_client);
                } else {
                    setTimeout(check, 30);
                }
            }
            check();
        });
    }

    async function signIn(email, password) {
        const client = await ensureClient();
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        return { data, error };
    }

    async function signUp(email, password, metadata = {}) {
        const client = await ensureClient();
        const { data, error } = await client.auth.signUp({
            email,
            password,
            options: { data: metadata }
        });
        return { data, error };
    }

    async function signOut() {
        const client = await ensureClient();
        const { error } = await client.auth.signOut();
        return { error };
    }

    async function resetPassword(email) {
        const client = await ensureClient();
        const origin = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
        const { data, error } = await client.auth.resetPasswordForEmail(email, {
            redirectTo: origin + 'login.html'
        });
        return { data, error };
    }

    async function getSession() {
        const client = await ensureClient();
        const { data, error } = await client.auth.getSession();
        return { session: data?.session ?? null, error };
    }

    async function getUser() {
        const client = await ensureClient();
        const { data, error } = await client.auth.getUser();
        return { user: data?.user ?? null, error };
    }

    function onAuthStateChange(callback) {
        ensureClient().then(client => client.auth.onAuthStateChange(callback));
    }

    // Redireciona para login se não autenticado
    async function requireAuth() {
        const { session } = await getSession();
        if (!session) {
            window.location.href = 'login.html';
            return null;
        }
        return session;
    }

    // Mensagens de erro amigáveis em português
    function friendlyError(error) {
        if (!error) return 'Erro desconhecido.';
        const msg = (error.message ?? '').toLowerCase();
        if (msg.includes('invalid login credentials') || msg.includes('invalid email or password')) return 'E-mail ou senha incorretos.';
        if (msg.includes('email not confirmed')) return 'E-mail não confirmado. Verifique sua caixa de entrada.';
        if (msg.includes('too many requests')) return 'Muitas tentativas. Aguarde alguns minutos.';
        if (msg.includes('user already registered')) return 'Este e-mail já está cadastrado.';
        if (msg.includes('password should be at least')) return 'A senha deve ter pelo menos 6 caracteres.';
        if (msg.includes('unable to validate email') || msg.includes('invalid email')) return 'E-mail inválido.';
        return error.message ?? 'Erro ao autenticar. Tente novamente.';
    }

    return { signIn, signUp, signOut, resetPassword, getSession, getUser, onAuthStateChange, requireAuth, friendlyError };
})();

window.AuthModule = AuthModule;
