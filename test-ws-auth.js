/**
 * Test WebSocket connection with token
 */
const WebSocket = require('ws');

const TOKEN = 'openclaw-secure-token-1738343500';
const WS_URL = 'ws://localhost:18789/api/v1/ws';

console.log('🧪 Testando conexão WebSocket...\n');

// Test 1: Without token
console.log('Test 1: Conexão SEM token');
const ws1 = new WebSocket(WS_URL);

ws1.on('open', () => {
  console.log('✅ Conectado sem token!');
  ws1.close();
});

ws1.on('error', (err) => {
  console.log('❌ Erro sem token:', err.message);
});

ws1.on('close', (code, reason) => {
  console.log(`⚠️  Fechou sem token - Code: ${code}, Reason: ${reason.toString()}\n`);

  // Test 2: With token in URL
  setTimeout(() => {
    console.log('Test 2: Conexão COM token na URL');
    const ws2 = new WebSocket(`${WS_URL}?token=${TOKEN}`);

    ws2.on('open', () => {
      console.log('✅ Conectado com token na URL!');
      ws2.close();
    });

    ws2.on('error', (err) => {
      console.log('❌ Erro com token URL:', err.message);
    });

    ws2.on('close', (code, reason) => {
      console.log(`⚠️  Fechou com token URL - Code: ${code}, Reason: ${reason.toString()}\n`);

      // Test 3: With token in headers
      setTimeout(() => {
        console.log('Test 3: Conexão COM token no header');
        const ws3 = new WebSocket(WS_URL, {
          headers: {
            'Authorization': `Bearer ${TOKEN}`,
            'X-Gateway-Token': TOKEN
          }
        });

        ws3.on('open', () => {
          console.log('✅ Conectado com token no header!');

          // Send auth message
          ws3.send(JSON.stringify({
            type: 'auth',
            token: TOKEN
          }));

          setTimeout(() => ws3.close(), 1000);
        });

        ws3.on('message', (data) => {
          console.log('📨 Resposta:', data.toString());
        });

        ws3.on('error', (err) => {
          console.log('❌ Erro com token header:', err.message);
        });

        ws3.on('close', (code, reason) => {
          console.log(`⚠️  Fechou com token header - Code: ${code}, Reason: ${reason.toString()}\n`);
          console.log('🎯 Teste completo!');
        });
      }, 1000);
    });
  }, 1000);
});
