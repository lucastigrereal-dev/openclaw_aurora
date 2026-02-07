#!/usr/bin/env node

const WebSocket = require('ws');

const WS_URL = 'ws://localhost:18789';

console.log('🔌 Conectando ao OpenClaw Aurora...');
console.log(`   URL: ${WS_URL}\n`);

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✅ Conectado!\n');

  // Test 1: util.datetime
  console.log('📝 Teste 1: util.datetime');
  const test1 = {
    skill: 'util.datetime',
    input: { operation: 'now' }
  };
  console.log(`   Enviando: ${JSON.stringify(test1)}`);
  ws.send(JSON.stringify(test1));
});

ws.on('message', (data) => {
  console.log('\n📨 Resposta recebida:');
  try {
    const response = JSON.parse(data);
    console.log(JSON.stringify(response, null, 2));

    // Test 2 after first response
    if (response.skill === 'util.datetime') {
      console.log('\n✅ Teste 1 completo!\n');

      console.log('📝 Teste 2: exec.bash');
      const test2 = {
        skill: 'exec.bash',
        input: { command: 'echo "OpenClaw Aurora está funcionando!"' }
      };
      console.log(`   Enviando: ${JSON.stringify(test2)}`);
      ws.send(JSON.stringify(test2));
    } else if (response.skill === 'exec.bash') {
      console.log('\n✅ Teste 2 completo!\n');

      console.log('📝 Teste 3: util.uuid');
      const test3 = {
        skill: 'util.uuid',
        input: { count: 3 }
      };
      console.log(`   Enviando: ${JSON.stringify(test3)}`);
      ws.send(JSON.stringify(test3));
    } else if (response.skill === 'util.uuid') {
      console.log('\n✅ Teste 3 completo!\n');

      console.log('📝 Teste 4: exec.powershell (Windows)');
      const test4 = {
        skill: 'exec.powershell',
        input: { command: 'Get-Date -Format "yyyy-MM-dd HH:mm:ss"' }
      };
      console.log(`   Enviando: ${JSON.stringify(test4)}`);
      ws.send(JSON.stringify(test4));
    } else if (response.skill === 'exec.powershell') {
      console.log('\n✅ Teste 4 completo!\n');

      console.log('📝 Teste 5: file.list');
      const test5 = {
        skill: 'file.list',
        input: { path: '.' }
      };
      console.log(`   Enviando: ${JSON.stringify(test5)}`);
      ws.send(JSON.stringify(test5));
    } else if (response.skill === 'file.list') {
      console.log('\n✅ Teste 5 completo!\n');
      console.log('🎉 Todos os testes executados com sucesso!');
      ws.close();
    }
  } catch (e) {
    console.log(data.toString());
  }
});

ws.on('error', (error) => {
  console.error('❌ Erro de conexão:', error.message);
  process.exit(1);
});

ws.on('close', () => {
  console.log('\n🔌 Desconectado do servidor');
  process.exit(0);
});

// Timeout em caso de hang
setTimeout(() => {
  console.error('\n⏱️  Timeout: Nenhuma resposta recebida');
  ws.close();
  process.exit(1);
}, 30000);
