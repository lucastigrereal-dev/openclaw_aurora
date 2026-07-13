# 🐺 Cérberos GO-LIVE

Workflow executável para coordenar Portal Rota das Águas, CRM Tigre, Leads e o teste ponta a ponta.

## 1. Configuração

Defina no `.env` ou na sessão do terminal:

```env
CERBERUS_CONCURRENCY=3
CERBERUS_DRY_RUN=false
ROTA_PORTAL_REPO=C:\caminho\rota-das-aguas-portal
ROTA_PORTAL_DEPLOY_COMMAND=npx vercel --prod
ROTA_PORTAL_PUBLIC_URL=https://seu-dominio
TIGRE_CRM_REPO=C:\caminho\tigre-digital-dash
TIGRE_CRM_PUBLIC_URL=https://tigre-digital-dash.pages.dev
ROTA_LEADS_PREP_COMMAND=python caminho\preparar_leads.py
ROTA_LEADS_AUDIT_COMMAND=python caminho\auditar_leads.py
TIGRE_CRM_IMPORT_COMMAND=npm run import:leads -- caminho\leads.csv
ROTA_GO_LIVE_E2E_COMMAND=npm run test:e2e:go-live
```

Os comandos são exemplos. Use apenas comandos verificados para o ambiente real. Nenhum segredo deve entrar no JSON do plano.

## 2. Inicializar

```bash
npm run cerberus -- init
```

Cria `data/cerberus/go-live-state.json` a partir de `config/cerberus-go-live.rota.json`.

## 3. Executar

```bash
npm run cerberus -- run
```

Portal, CRM e Leads começam em paralelo. O processo para quando não houver trabalho elegível ou quando encontrar um portão de aprovação.

## 4. Consultar

```bash
npm run cerberus -- status
```

Retorna percentual, contagens, aprovações, falhas, bloqueios e próxima ação.

## 5. Aprovar ações sensíveis

```bash
npm run cerberus -- approve data/cerberus/go-live-state.json portal.deploy
npm run cerberus -- resume
npm run cerberus -- approve data/cerberus/go-live-state.json crm.import
npm run cerberus -- resume
```

O teste final `integration.e2e` também exige aprovação.

## Estados

- `pending`: aguardando dependências.
- `running`: em execução.
- `waiting_approval`: precisa de Lucas.
- `succeeded`: concluído com evidência.
- `failed`: falhou após tentativas.
- `blocked`: dependência falhou.

## Regra operacional

Lucas dá uma ordem à Aurora. Aurora inicializa ou retoma o workflow, lê o resumo e só retorna ao Lucas em caso de aprovação, acesso, gasto, bloqueio real ou entrega comprovada.
