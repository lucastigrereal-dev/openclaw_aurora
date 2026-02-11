# 🔍 Como Descobrir seu Telegram Chat ID

## Método 1: Usando o Bot (Mais Fácil)

### Passo 1: Inicie o sistema
```bash
START-AURORA.bat
```

### Passo 2: Abra o Telegram e procure seu bot
```
Busque: @Prometheus_tigre_bot
```

### Passo 3: Envie qualquer mensagem
```
/start
```

### Passo 4: Olhe o console do sistema
Você verá algo assim:
```
[Bot] Message from chat: 123456789
[Bot] User: SeuNome
```

**O número que aparece é seu CHAT ID!**

Exemplo:
```
[Bot] Message from chat: 987654321  ← ESTE É O SEU CHAT ID!
```

---

## Método 2: Usando Bot do Telegram

### Passo 1: Abra o Telegram

### Passo 2: Busque o bot
```
@userinfobot
```

### Passo 3: Inicie conversa
```
/start
```

### Passo 4: Ele vai te enviar:
```
Id: 987654321  ← ESTE É O SEU CHAT ID!
First name: Seu Nome
Username: @seu_username
```

---

## Método 3: Usando API do Telegram

### Passo 1: Abra no navegador
```
https://api.telegram.org/bot<SEU_TOKEN>/getUpdates
```

Substitua `<SEU_TOKEN>` pelo seu:
```
8017049336:AAFgjCG7s5kq_7OvQ3XrdFwanoow9eYx3lY
```

URL completa:
```
https://api.telegram.org/bot8017049336:AAFgjCG7s5kq_7OvQ3XrdFwanoow9eYx3lY/getUpdates
```

### Passo 2: Envie uma mensagem pro bot ANTES de abrir a URL

### Passo 3: Procure no JSON retornado:
```json
{
  "message": {
    "chat": {
      "id": 987654321  ← ESTE É O SEU CHAT ID!
    }
  }
}
```

---

## ✅ Depois de Descobrir

### Configure no .env:
```bash
TELEGRAM_CHAT_ID=987654321
```

### Reinicie o sistema:
```bash
Ctrl+C
START-AURORA.bat
```

---

## 🎯 Verificar se Funcionou

Depois de configurar, você verá:
```
[Bot] Admin Chat ID: 987654321  ← Configurado!
```

Agora você é o admin e pode usar todos os comandos! 🎉
