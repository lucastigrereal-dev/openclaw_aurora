/**
 * Check Railway deployment status
 * Run: node check-railway.js
 */

const https = require('https');

const RAILWAY_APP_URL = 'openclawaurora-production.up.railway.app';

console.log('🔍 Verificando status do Railway...\n');

// 1. Check if app is running
const options = {
  hostname: RAILWAY_APP_URL,
  port: 443,
  path: '/',
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0'
  }
};

const req = https.request(options, (res) => {
  console.log(`✅ App responde: ${res.statusCode}`);
  console.log(`📝 Headers:`, res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\n📄 Response:');
    console.log(data.substring(0, 500));

    // Check WebSocket
    console.log('\n🔌 Verificando WebSocket (porta 18789)...');
    checkWebSocket();
  });
});

req.on('error', (e) => {
  console.error(`❌ Erro ao conectar: ${e.message}`);
  console.log('\n⚠️  O app pode não estar rodando no Railway!');
  console.log('\n📋 Próximos passos:');
  console.log('1. Acesse: https://railway.app/dashboard');
  console.log('2. Veja os logs do deploy');
  console.log('3. Verifique variáveis de ambiente (TELEGRAM_TOKEN)');
});

req.end();

function checkWebSocket() {
  const wsOptions = {
    hostname: RAILWAY_APP_URL,
    port: 443,
    path: '/api/v1/ws',
    method: 'GET',
    headers: {
      'Upgrade': 'websocket',
      'Connection': 'Upgrade',
      'User-Agent': 'Mozilla/5.0'
    }
  };

  const wsReq = https.request(wsOptions, (res) => {
    if (res.statusCode === 101) {
      console.log('✅ WebSocket endpoint respondeu!');
    } else {
      console.log(`⚠️  WebSocket retornou: ${res.statusCode}`);
    }
  });

  wsReq.on('error', (e) => {
    console.log(`❌ WebSocket erro: ${e.message}`);
  });

  wsReq.end();
}
