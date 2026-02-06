# Hub Enterprise MVP para MoltBot / OpenClaw

Este pacote contém uma versão mínima e funcional do **Hub Enterprise** que você pode integrar ao MoltBot ou executar de forma independente para criar, testar e monitorar aplicativos enterprise. A estrutura segue boas práticas de engenharia de plataforma e inclui ferramentas de orquestração, templates, personas e monitoramento.

## 📁 Estrutura de Diretórios

- `contracts/` – schema JSON que define o formato único de saída das personas.
- `router/` – classificador de intenção (`intent_classifier.js`) e testes.
- `personas/` – scripts e documentação de cada persona (produto, engenharia e QA neste MVP).
- `templates/enterprise_app/` – exemplo de template de app com Express.
- `guardioes/` – scripts de monitoramento (`sentinela.sh`) e auto‑recovery (`bombeiro.sh`).
- `queue/` – filas pendentes e concluídas (JSONL).
- `apps/` – onde os apps gerados serão criados.
- `logs/` – logs de atividades e auditoria.

## 🚀 Como usar

1. **Instale Node.js** (versão 16 ou superior) e `npm` se ainda não tiver.
2. **Exporte suas chaves do Telegram** (opcional) como variáveis de ambiente:

   ```bash
   export TELEGRAM_BOT_TOKEN="<seu_token>"
   export TELEGRAM_CHAT_ID="<seu_chat_id>"
   ```

3. Dê permissão de execução aos scripts:

   ```bash
   chmod +x orchestrate.sh personas/engenharia/scripts/gerar_esqueleto.sh personas/qa/scripts/smoke_tests.sh guardioes/*.sh
   ```

4. **Crie um app** usando o orquestrador:

   ```bash
   ./orchestrate.sh "faz o app pedidos_online"
   ```

   Isso irá:
   - Classificar a intenção da mensagem.
   - Definir o MVP com a persona Produto.
   - Gerar o esqueleto do app em `apps/pedidos_online`.
   - Rodar os testes de fumaça com a persona QA.

5. **Monitoramento** – configure um cron para rodar o `sentinela.sh` periodicamente e apontar para o app desejado:

   ```bash
   # a cada 1 minuto
   * * * * * /caminho/para/hub/guardioes/sentinela.sh pedidos_online 3000
   ```

## 🔐 Segurança

- Os scripts verificam se estão rodando como `root` e abortam por segurança.
- Use nomes de apps com apenas `a-z`, `0-9`, `_` ou `-`.
- Segredos não devem ser hardcoded: utilize variáveis de ambiente ou services como Vault.

## 🎯 Limitações do MVP

- Apenas três personas (produto, engenharia e QA) estão implementadas. Personas como Arquitetura, Ops ou Dados não estão incluídas, mas a estrutura permite adicioná‑las.
- O monitoramento ainda é simples; para produção, implemente SLOs, painéis de métricas e runbooks mais avançados.

## ➕ Próximos Passos

- Adicionar personas adicionais conforme o blueprint (Ops, Dados etc.).
- Transformar runbooks YAML em workflows executáveis.
- Criar templates avançados com CI/CD, observabilidade e segurança embutidas.
- Integrar com o MoltBot para execução via agentes.

Este MVP serve como prova de conceito. Ajuste, expanda e adapte ao seu ambiente para construir uma fábrica de aplicativos completa.
