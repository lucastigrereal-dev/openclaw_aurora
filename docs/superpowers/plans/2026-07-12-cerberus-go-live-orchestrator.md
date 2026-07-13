# Cerberus GO-LIVE Orchestrator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir uma skill persistente que coordene Portal, CRM e Leads em paralelo até o teste ponta a ponta.

**Architecture:** Um motor genérico interpreta um plano declarativo, persiste estados e usa o SkillRegistry para executar capacidades existentes. Aprovações bloqueiam ações sensíveis; evidências e erros ficam no estado JSON.

**Tech Stack:** TypeScript 5.6, Node.js 22, SkillRegistry, `fs/promises`, `assert`, `ts-node`.

## Global Constraints
- Não armazenar segredos no plano ou estado.
- Não executar passos sensíveis sem aprovação.
- Preservar repositórios e arquivos canônicos.
- Não depender de APIs externas nos testes.

---

### Task 1: Scheduler e persistência
**Files:** `skills/cerberus-go-live-workflow.ts`, `test-cerberus-go-live.ts`
- [x] Escrever testes de dependências, paralelismo e persistência.
- [x] Implementar validação do plano, estado atômico e seleção de passos prontos.

### Task 2: Execução e portões
**Files:** `skills/cerberus-go-live-workflow.ts`, `test-cerberus-go-live.ts`
- [x] Testar falha, bloqueio seletivo e aprovação.
- [x] Implementar execução via SkillRegistry, evidências e retomada.

### Task 3: CLI e plano da Rota
**Files:** `cerberus-go-live.ts`, `config/cerberus-go-live.rota.json`, `package.json`
- [x] Criar comandos init, run, resume, status, approve e reset.
- [x] Criar trilhas Portal, CRM, Leads e Integração.

### Task 4: Verificação automatizada
**Files:** `.github/workflows/cerberus-go-live-ci.yml`
- [x] Executar teste focado no Node 22.
- [x] Executar build TypeScript.
- [ ] Corrigir qualquer falha indicada pelo CI.

### Task 5: Handoff operacional
- [ ] Configurar caminhos e comandos reais no ambiente do Lucas.
- [ ] Rodar `init`, depois `run`.
- [ ] Aprovar gates somente após revisar evidências.
- [ ] Registrar o primeiro GO-LIVE concluído.
