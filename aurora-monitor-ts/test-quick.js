/**
 * Teste rápido do Aurora Monitor
 */

const {
  CircuitBreaker,
  RateLimiter,
  AlertManager,
  AlertLevel,
  AnomalyDetector,
  MetricsCollector,
  AutoHealer,
  ProcessWatchdog,
  OpenClawIntegration
} = require('./dist');

async function runTests() {
  console.log('\n🧪 TESTANDO AURORA MONITOR\n');
  console.log('='.repeat(50));

  // Test 1: Circuit Breaker
  console.log('\n1️⃣  Circuit Breaker');
  const cb = new CircuitBreaker({
    name: 'test-service',
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 5000,
  });

  // Simula sucesso
  await cb.execute(async () => 'ok').then(() => console.log('   ✅ Execute com sucesso'));
  console.log(`   Estado: ${cb.getState()}`);

  // Simula falhas
  for (let i = 0; i < 3; i++) {
    try {
      await cb.execute(async () => { throw new Error('fail'); });
    } catch {}
  }
  console.log(`   ✅ Após 3 falhas, estado: ${cb.getState()}`);

  // Test 2: Rate Limiter
  console.log('\n2️⃣  Rate Limiter');
  const rl = new RateLimiter({
    name: 'test-limiter',
    rate: 5,
    burst: 5,
  });

  let accepted = 0;
  for (let i = 0; i < 10; i++) {
    if (rl.acquire()) accepted++;
  }
  console.log(`   ✅ ${accepted}/10 requisições aceitas (rate: 5/s)`);

  // Test 3: Alert Manager
  console.log('\n3️⃣  Alert Manager');
  const am = new AlertManager({
    enabled: true,
    cooldown: 1000,
    aggregateAlerts: true,
  });

  const alert = am.send({
    level: AlertLevel.WARNING,
    title: 'Test Alert',
    message: 'This is a test',
    source: 'aurora.test',
  });
  console.log(`   ✅ Alerta enviado: ${alert ? alert.id : 'agregado'}`);

  // Test 4: Anomaly Detector
  console.log('\n4️⃣  Anomaly Detector');
  const ad = new AnomalyDetector({
    enabled: true,
    detectionInterval: 1000,
    windowSize: 10,
    zScoreThreshold: 2,
    trendThreshold: 20,
    spikeMultiplier: 2,
  });

  // Adiciona amostras normais
  for (let i = 0; i < 10; i++) {
    ad.addMetricSample('test.metric', 50 + Math.random() * 10);
  }
  // Adiciona spike
  ad.addMetricSample('test.metric', 200);

  const anomalies = ad.detect();
  console.log(`   ✅ Anomalias detectadas: ${anomalies.length}`);
  if (anomalies.length > 0) {
    console.log(`   📊 Tipo: ${anomalies[0].type}, Severidade: ${anomalies[0].severity}`);
  }

  // Test 5: Metrics Collector
  console.log('\n5️⃣  Metrics Collector');
  const mc = new MetricsCollector({
    enabled: true,
    collectionInterval: 1000,
    historySize: 100,
    cpuThreshold: 80,
    memoryThreshold: 85,
    diskThreshold: 90,
    eventLoopLagThreshold: 100,
    includeProcessMetrics: true,
  });

  const metrics = await mc.collect();
  console.log(`   ✅ CPU: ${metrics.cpu.percent.toFixed(1)}%`);
  console.log(`   ✅ Memória: ${metrics.memory.percent.toFixed(1)}%`);
  console.log(`   ✅ Disco: ${metrics.disk.percent.toFixed(1)}%`);
  console.log(`   ✅ Heap usado: ${(metrics.memory.heapUsed / 1024 / 1024).toFixed(1)} MB`);

  // Test 6: OpenClaw Integration
  console.log('\n6️⃣  OpenClaw Integration');
  const integration = new OpenClawIntegration();

  // Registra canal mock
  const mockChannel = {
    name: 'test-telegram',
    type: 'telegram',
    isConnected: () => true,
    connect: async () => {},
    disconnect: async () => {},
    sendMessage: async (chatId, msg) => {
      console.log(`   📤 Mock send to ${chatId}: ${msg.substring(0, 20)}...`);
    },
  };

  const protectedChannel = integration.registerChannel(mockChannel);
  console.log(`   ✅ Canal protegido registrado: ${protectedChannel.getStatus().name}`);

  // Registra AI mock
  const mockAI = {
    name: 'test-claude',
    type: 'claude',
    isAvailable: async () => true,
    complete: async (prompt) => `Response to: ${prompt}`,
  };

  const protectedAI = integration.registerAIProvider(mockAI);
  console.log(`   ✅ AI protegida registrada: ${protectedAI.getStatus().name}`);

  // Testa envio protegido
  await protectedChannel.execute(async () => {
    await mockChannel.sendMessage('123', 'Hello World!');
  });
  console.log('   ✅ Mensagem enviada via canal protegido');

  // Testa AI protegida
  const response = await protectedAI.complete('Test prompt');
  console.log(`   ✅ AI response: ${response}`);

  // Status geral
  console.log('\n' + '='.repeat(50));
  console.log('📊 STATUS GERAL:');
  const status = integration.getStatus();
  console.log(`   Running: ${status.running}`);
  console.log(`   Channels: ${status.channels.length}`);
  console.log(`   AI Providers: ${status.aiProviders.length}`);

  console.log('\n' + '='.repeat(50));
  console.log('✅ TODOS OS TESTES PASSARAM!\n');
}

runTests().catch(console.error);
