/**
 * Test WebSocket with proper challenge response
 */
const WebSocket = require('ws');

const TOKEN = 'openclaw-secure-token-1738343500';
const WS_URL = 'ws://localhost:18789/api/v1/ws';

console.log('🔐 Testando autenticação com challenge...\n');

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✅ WebSocket conectado, aguardando challenge...');
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log('📨 Mensagem recebida:', JSON.stringify(msg, null, 2));

  // Responder ao challenge
  if (msg.event === 'connect.challenge') {
    console.log('\n🔑 Challenge recebido! Respondendo com token...\n');

    // Tentar diferentes formatos de resposta
    const responses = [
      {
        type: 'event',
        event: 'connect.auth',
        payload: {
          token: TOKEN,
          nonce: msg.payload.nonce
        }
      },
      {
        type: 'auth',
        token: TOKEN,
        nonce: msg.payload.nonce
      },
      {
        type: 'event',
        event: 'authenticate',
        payload: { token: TOKEN }
      }
    ];

    // Enviar primeira resposta
    console.log('📤 Enviando resposta de auth...');
    ws.send(JSON.stringify(responses[0]));
  }

  // Ver se foi autenticado
  if (msg.event === 'connect.success' || msg.type === 'authenticated') {
    console.log('\n✅ AUTENTICADO COM SUCESSO! 🎉\n');
  }
});

ws.on('error', (err) => {
  console.log('❌ Erro:', err.message);
});

ws.on('close', (code, reason) => {
  console.log(`\n⚠️  Conexão fechada - Code: ${code}, Reason: ${reason.toString()}`);

  if (code === 1008) {
    console.log('\n🔴 ERRO 1008 - Formato de autenticação incorreto');
    console.log('💡 Precisamos descobrir o formato correto que o servidor espera');
  }
});

// Timeout
setTimeout(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
}, 5000);
