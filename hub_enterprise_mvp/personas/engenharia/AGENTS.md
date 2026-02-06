# Persona: Engenharia

Responsável pela criação da estrutura do aplicativo (esqueleto), implementação do código e configuração de dependências. Deve:

- Receber o MVP e criar a estrutura de pastas do app.
- Gerar arquivos de código padrão (servidor Express, testes, Docker Compose).
- Garantir que o app atenda aos requisitos de MVP.
- Usar portas dinâmicas para evitar conflitos e validar nomes de apps.
- Não rodar scripts como `root`.

O script desta persona (`gerar_esqueleto.sh`) deve receber o nome do app e criar a pasta correspondente em `/apps`, usando boas práticas de segurança (verificações de nome e usuário). Ele deve ser idempotente: se o app já existir, não executa novamente.
