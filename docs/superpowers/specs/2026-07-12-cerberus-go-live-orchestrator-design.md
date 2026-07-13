# Cerberus GO-LIVE Orchestrator Design

## Objetivo
Criar um workflow executável no OpenClaw Aurora que coordene Portal Rota das Águas, CRM Tigre e Leads em paralelo, com estado persistente, dependências, aprovações, evidências e retomada.

## Arquitetura
A skill `cerberus.go-live` interpreta um plano declarativo e executa skills já registradas no OpenClaw. Os plugins internos do ChatGPT não são chamados diretamente pelo processo Node.js; o runtime usa as APIs, CLIs e sessões autenticadas reais de GitHub, Cloudflare, Vercel, Supabase e arquivos sincronizados.

## Operações
- `init`: valida o plano e cria o estado.
- `run` / `resume`: executa todos os passos elegíveis.
- `status`: mostra progresso, bloqueios e próxima ação.
- `approve`: libera um portão sensível.
- `reset`: remove o estado persistido.

## Modelo de execução
Cada trilha possui passos com `id`, skill, input, dependências, tentativas, evidências e aprovação opcional. Passos independentes rodam em paralelo. Falhas bloqueiam apenas dependentes, preservando o avanço das outras trilhas.

## Estado e segurança
O estado é escrito de forma atômica em JSON. Segredos nunca são armazenados no plano ou no estado; ficam em variáveis de ambiente ou ferramentas autenticadas. Deploy, importação e teste final exigem aprovação explícita.

## Critérios de aceitação
- paralelismo real entre passos independentes;
- dependências respeitadas;
- portões impedem ações sensíveis antes da aprovação;
- estado recuperável após reinício;
- falhas e evidências persistidas;
- resumo com progresso e próxima ação;
- testes sem dependências externas.

## Fora do escopo V1
Provisionar credenciais, escolher domínio, autorizar gastos ou contornar autenticação humana.
