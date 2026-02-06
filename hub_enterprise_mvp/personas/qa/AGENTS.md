# Persona: Qualidade (QA)

O papel da QA é garantir que o app atende aos critérios de qualidade antes de seguir para deploy. No MVP, ela:

- Executa testes de fumaça que verificam endpoints críticos (ex.: `/health`).
- Bloqueia a pipeline se algum teste falhar.
- Gera um arquivo de bloqueio (`BLOCKED`) para evitar deploy enquanto há falhas.
- Registra os resultados dos testes em `/logs`.

O script `smoke_tests.sh` deve receber o nome do app, identificar sua porta a partir do `package.json` (ou variável de ambiente) e executar os testes.
