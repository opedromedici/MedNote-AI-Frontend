Perfeito. Esse é um projeto excelente e com alto valor percebido. Vou estruturar um **PRD completo focado no agente e no fluxo de IA**, no mesmo padrão profissional que fizemos antes, mas agora para o **gravador de consulta médica com dupla saída inteligente**.

A ideia central aqui é:

> 🎯 Capturar áudio → Transcrever → Processar com IA → Gerar 2 documentos diferentes (Paciente + Médico)

Vou montar isso já pensando em implementação moderna em Python.

---

# PRD — Sistema de Gravação e Inteligência de Consultas Médicas

## Medical Consultation Recorder + AI Summarizer

---

# 1. Visão Geral do Produto

Desenvolver um sistema que permita ao médico:

1. Gravar consultas médicas em áudio
2. Transcrever automaticamente a conversa completa
3. Processar a transcrição com Inteligência Artificial
4. Gerar automaticamente dois documentos distintos:

### Documento 1 — Versão Paciente

* Linguagem simples
* Explicação clara
* Principais pontos discutidos
* Diagnóstico (quando aplicável)
* Plano de ação
* Recomendações
* Orientações práticas

### Documento 2 — Versão Médico

* Linguagem técnica
* Termos científicos
* Estrutura clínica detalhada
* Conduta médica
* Prescrições
* Observações clínicas
* Lembrete completo da consulta

---

# 2. Objetivo do Sistema

Objetivos principais:

* Reduzir carga cognitiva do médico
* Evitar perda de informações da consulta
* Melhorar comunicação com pacientes
* Automatizar documentação clínica
* Economizar tempo pós-consulta

Objetivos secundários:

* Padronizar registros
* Aumentar qualidade do atendimento
* Criar histórico estruturado
* Melhorar adesão ao tratamento

---

# 3. Usuários do Sistema

### Usuário principal

* Médicos
* Profissionais de saúde

### Usuário secundário

* Paciente (recebe resumo simplificado)

---

# 4. Fluxo Geral do Sistema

Fluxo principal:

1. Médico inicia gravação
2. Consulta acontece
3. Médico finaliza gravação
4. Áudio é enviado para transcrição
5. Transcrição é processada por IA
6. Sistema gera:

   * Resumo paciente
   * Resumo médico
7. Documentos ficam disponíveis para download ou envio

---

# 5. Componentes do Sistema

## 5.1 Módulo de Gravação

Funções:

* Iniciar gravação
* Pausar
* Finalizar
* Upload automático
* Armazenar áudio temporariamente

Formato recomendado:

* WAV ou MP3 (qualidade média alta)
* 16kHz ou 44kHz

---

## 5.2 Módulo de Transcrição

Função:

Converter áudio em texto completo.

Tecnologias possíveis:

* Whisper
* Deepgram
* AssemblyAI
* Google Speech-to-Text

Requisitos:

* Alta precisão médica
* Identificação de falantes (opcional futuro)
* Pontuação automática
* Segmentação por frases

Saída:

Texto bruto completo da consulta.

---

## 5.3 Módulo de Processamento com IA

Entrada:

Transcrição completa.

Processamento:

Agente de IA analisa conteúdo e extrai:

* Sintomas
* Queixas
* Histórico
* Diagnóstico
* Conduta
* Prescrições
* Recomendações
* Exames solicitados
* Plano terapêutico

Depois gera dois outputs diferentes.

---

# 6. Documento 1 — Resumo Paciente (Linguagem Simples)

Objetivo:

Facilitar entendimento do paciente.

Estrutura:

1. Motivo da consulta
2. O que foi identificado
3. Explicação simples da condição
4. O que deve ser feito
5. Medicamentos prescritos
6. Cuidados importantes
7. Próximos passos
8. Sinais de alerta
9. Recomendações gerais

Tom:

* Claro
* Didático
* Acolhedor
* Sem termos complexos

---

# 7. Documento 2 — Resumo Médico (Linguagem Técnica)

Objetivo:

Registrar consulta com precisão clínica.

Estrutura:

1. Identificação do paciente
2. Queixa principal
3. História da doença atual
4. Antecedentes relevantes
5. Avaliação clínica
6. Hipóteses diagnósticas
7. Diagnóstico provável
8. Conduta adotada
9. Prescrições
10. Exames solicitados
11. Plano terapêutico
12. Observações médicas
13. Follow-up recomendado

Tom:

* Técnico
* Científico
* Preciso
* Profissional

---

# 8. Arquitetura do Agente de IA

Componentes:

1. Transcription Processor
2. Medical Context Analyzer
3. Patient Summary Generator
4. Clinical Summary Generator
5. Validation Layer (consistência)

Pipeline:

Áudio → Texto → Análise → Outputs

---

# 9. Segurança e Privacidade (Muito Importante)

Dados médicos são sensíveis.

Requisitos:

* Criptografia em trânsito (HTTPS)
* Criptografia em repouso
* Controle de acesso
* Tokens seguros
* Exclusão automática de arquivos temporários
* Logs protegidos

Compatibilidade recomendada:

* LGPD
* HIPAA (se internacional)

---

# 10. Regras Críticas do Sistema

O agente nunca deve:

* Inventar diagnósticos
* Criar prescrições inexistentes
* Alterar doses
* Assumir informações não mencionadas
* Omitir riscos importantes mencionados

Se houver dúvida:

* Indicar incerteza claramente

---

# 11. Funcionalidades Futuras (Opcional)

* Identificação automática de falantes
* Integração com prontuário eletrônico
* Histórico longitudinal do paciente
* IA para sugestão de conduta
* Geração de receitas digitais
* Dashboard clínico
* Busca por sintomas
* Estatísticas médicas

---

# 12. Critérios de Sucesso

Sistema será considerado bem sucedido quando:

* Transcrição tiver alta precisão
* Resumo paciente for compreensível
* Resumo médico for clinicamente útil
* Tempo total pós-consulta for reduzido
* Médicos confiarem no sistema

---

# 13. Arquitetura Técnica Recomendada (Python)

Componentes:

* Backend: FastAPI
* Transcrição: Whisper API ou local
* IA: Claude / GPT
* Storage: S3 / Supabase Storage
* Banco: PostgreSQL
* Filas: Redis / Celery (opcional)

---

# 14. Prompt Base do Agente Médico (Conceito)

Objetivo do agente:

> Você é um assistente clínico especializado em análise de consultas médicas.
> Sua função é transformar uma transcrição em dois documentos:
>
> 1. versão paciente com linguagem simples
> 2. versão médica com linguagem técnica.
>    Nunca invente informações.
>    Use apenas o conteúdo da transcrição.
>    Se algo não estiver claro, indique incerteza.

---

# 15. Interfaces Esperadas

Funções principais:

* upload_audio()
* transcribe_audio()
* generate_patient_summary()
* generate_medical_summary()
* export_document()

Perfeito. Isso que você quer adicionar é uma **camada de personalização de saída (Output Formatting Engine)** — e isso aumenta MUITO o valor do produto, porque cada médico trabalha de um jeito diferente.

Vou atualizar o PRD adicionando essa funcionalidade como um módulo oficial do sistema.

Abaixo está a **extensão do PRD**, já estruturada profissionalmente para integração direta no projeto.

---

# 🔧 EXTENSÃO DO PRD — Personalização de Formato dos Resumos

## 17. Sistema de Personalização de Formato de Saída (Custom Output Engine)

O sistema deverá permitir que cada médico defina como deseja que os documentos sejam gerados, tanto para:

* Resumo do paciente
* Resumo do médico

Essa personalização será baseada em **prompts de formatação definidos pelo usuário**.

---

# 17.1 Objetivo da Personalização

Permitir que o médico:

* Escolha a estrutura do documento
* Defina títulos e seções
* Defina nível de detalhe
* Defina estilo de linguagem
* Defina ordem das informações
* Padronize relatórios conforme sua prática clínica

O sistema deve respeitar essas configurações automaticamente.

---

# 17.2 Conceito de Funcionamento

Fluxo atualizado:

1. Áudio → Transcrição
2. IA analisa conteúdo clínico
3. Sistema carrega template personalizado do médico
4. IA gera documento seguindo o template
5. Documento final é entregue

Ou seja:

> Conteúdo vem da consulta
> Estrutura vem do médico

---

# 17.3 Tipos de Personalização Permitidos

## Personalização do Resumo Médico

Exemplos de variações possíveis:

* SOAP Note (Subjective, Objective, Assessment, Plan)
* Evolução clínica tradicional
* Prontuário estruturado
* Modelo por especialidade
* Checklists clínicos
* Texto narrativo
* Bullet points
* Modelo livre

---

## Personalização do Resumo do Paciente

Exemplos:

* Linguagem mais simples ou mais técnica
* Texto curto ou detalhado
* Estrutura por tópicos
* Formato de plano de ação
* Orientações passo a passo
* Estilo educacional
* Estilo motivacional
* Estilo institucional

---

# 17.4 Templates Baseados em Prompt

Cada médico poderá definir dois prompts:

### Prompt 1 — Template Médico

Define como o relatório clínico deve ser estruturado.

### Prompt 2 — Template Paciente

Define como o documento do paciente deve ser estruturado.

---

# 17.5 Estrutura Técnica dos Templates

Cada template conterá:

* Instruções de formatação
* Estrutura desejada
* Seções obrigatórias
* Estilo de linguagem
* Regras específicas

Exemplo conceitual:

```
Você deve gerar o resumo clínico no seguinte formato:

Seção 1 — Queixa Principal
Seção 2 — História da Doença Atual
Seção 3 — Avaliação Clínica
Seção 4 — Conduta
Seção 5 — Prescrições
Seção 6 — Plano de acompanhamento

Use linguagem técnica médica.
Não omita informações relevantes.
```

---

# 17.6 Prioridade do Sistema

Ordem de prioridade:

1. Segurança clínica
2. Conteúdo real da consulta
3. Template personalizado
4. Estilo de linguagem

Ou seja:

O sistema nunca pode sacrificar precisão médica por estética de template.

---

# 17.7 Validação Automática de Consistência

Após gerar o documento personalizado, o sistema deverá executar uma verificação para garantir:

* Prescrições foram incluídas
* Diagnósticos não foram inventados
* Informações importantes não foram omitidas
* Conteúdo corresponde à transcrição

Se houver inconsistência:

* Regenerar ou sinalizar erro

---

# 17.8 Banco de Templates

O sistema deve armazenar:

* Template médico por usuário
* Template paciente por usuário
* Versões
* Data de atualização

Estrutura exemplo:

```
DoctorProfile
  id
  name
  specialty
  patient_template_prompt
  medical_template_prompt
```

---

# 17.9 Templates Padrão do Sistema (Default)

Caso o médico não configure nada, o sistema deve possuir modelos padrão:

### Padrão Médico

Modelo clínico estruturado universal.

### Padrão Paciente

Resumo simples com plano de ação.

---

# 17.10 Interface de Configuração

O médico deverá poder:

* Editar template médico
* Editar template paciente
* Salvar versões
* Testar template com consulta exemplo
* Restaurar padrão

---

# 17.11 Benefício Estratégico

Essa funcionalidade permite:

* Adaptação a qualquer especialidade
* Padronização de prontuário
* Diferenciação do produto
* Alto valor percebido
* Personalização clínica real

---

# 17.12 Arquitetura do Pipeline Atualizada

Pipeline completo agora:

Áudio
↓
Transcrição
↓
Análise Clínica IA
↓
Carregar Template Personalizado
↓
Geração Documento Médico
↓
Geração Documento Paciente
↓
Validação
↓
Entrega Final

---

# 17.13 Prompt Base Atualizado do Agente

Conceito:

> Você é um assistente clínico especializado.
> Use exclusivamente a transcrição da consulta como fonte de informação.
> Gere dois documentos seguindo os templates fornecidos pelo médico.
> Nunca invente informações.
> Se algo estiver incerto, sinalize.
> Priorize segurança clínica e precisão.
