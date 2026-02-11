# 🤖 Como Pegar Novo Token do Telegram

## Passo 1: Abrir Telegram

Abra o Telegram no celular ou desktop.

## Passo 2: Buscar @BotFather

Busque por: **@BotFather**

## Passo 3: Comandos

### Se já tem um bot (Prometheus_tigre_bot):

```
/mybots
```

Selecione: **Prometheus_tigre_bot**

Depois:
```
API Token
```

O BotFather vai te enviar o token novamente!

### Se quer criar novo bot:

```
/newbot
```

Siga as instruções:
1. Nome do bot: `Meu Bot Aurora`
2. Username: `meubot_aurora_bot` (deve terminar com _bot)

O BotFather vai te dar o token!

## Passo 4: Copiar Token

Você vai receber algo assim:
```
Done! Here is your token:
1234567890:ABCdefGHIjklMNOpqrsTUVwxyz1234567

Keep your token secure and store it safely...
```

## Passo 5: Configurar no .env

Abra o arquivo `.env` e substitua:

```bash
TELEGRAM_TOKEN=SEU_NOVO_TOKEN_AQUI
```

Exemplo:
```bash
TELEGRAM_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz1234567
```

## Passo 6: Reiniciar Sistema

```bash
START-AURORA.bat
```

Agora deve funcionar! ✅

---

## ⚠️ IMPORTANTE:

- **NUNCA** compartilhe seu token
- Se compartilhar acidentalmente, revogue e pegue novo
- O token é como uma senha do bot
