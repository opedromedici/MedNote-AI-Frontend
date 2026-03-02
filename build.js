// build.js — Roda no deploy da Vercel para gerar config.js com a API key
// A chave vem da variável de ambiente OPENAI_API_KEY configurada no painel da Vercel.
const fs = require('fs');

const key = process.env.OPENAI_API_KEY || '';

if (!key) {
    console.warn('[build] ATENÇÃO: OPENAI_API_KEY não definida. Configure no painel da Vercel.');
}

fs.writeFileSync('config.js', `// Gerado automaticamente no build — não editar\nconst CONFIG = { OPENAI_API_KEY: '${key}' };\n`);

console.log('[build] config.js gerado com sucesso.');
