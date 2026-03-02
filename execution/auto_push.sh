#!/usr/bin/env bash
# execution/auto_push.sh
# Auto-commit e push de todas as mudanças para o GitHub.
# Chamado pelo Claude Code Stop hook e manualmente se necessário.

set -e

REPO="G:/Meu Drive/PROJETOS DE IA (Claude Code + Cursor + Antigravity)/MedNote AI/MedNote-AI-Frontend"

cd "$REPO"

# Verifica se há algo para commitar (modificados, novos ou deletados)
if git diff --quiet && git diff --staged --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
    echo "[auto_push] Nada para commitar."
    exit 0
fi

TIMESTAMP=$(date '+%Y-%m-%d %H:%M')

# Adiciona tudo exceto arquivos sensíveis (já cobertos pelo .gitignore)
git add -A

git commit -m "auto: save $TIMESTAMP

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"

git push origin main

echo "[auto_push] Push realizado: $TIMESTAMP"
