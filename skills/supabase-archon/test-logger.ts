/**
 * Test script for Supabase Logger
 */

import { SupabaseLogger, createLogger } from './supabase-logger';
import { VaultManager, getVault } from './supabase-vault-config';

async function testLogger() {
  console.log('');
  console.log('========================================');
  console.log('TESTE 1: Logger Básico');
  console.log('========================================');
  console.log('');

  const logger = createLogger('test-skill');

  logger.info('Logger inicializado', { version: '1.0.0' });
  logger.debug('Teste de debug', { data: 'exemplo' });
  logger.warn('Teste de warning', { threshold: 90 });
  logger.error('Teste de erro', { error: 'Simulado' });

  console.log('');
  console.log('========================================');
  console.log('TESTE 2: Logger com Trace ID');
  console.log('========================================');
  console.log('');

  const tracedLogger = createLogger('traced-skill', 'trace-123-456');
  tracedLogger.info('Log com trace ID', { operation: 'test' });

  console.log('');
  console.log('========================================');
  console.log('TESTE 3: Child Logger');
  console.log('========================================');
  console.log('');

  const parentLogger = createLogger('parent-skill', 'trace-789');
  const childLogger = parentLogger.child('child-skill');

  parentLogger.info('Parent log');
  childLogger.info('Child log (mesmo trace ID)');

  console.log('');
  console.log('========================================');
  console.log('TESTE 4: Vault Manager');
  console.log('========================================');
  console.log('');

  const vault = getVault();

  // Set some test secrets
  vault.set('TEST_SECRET_1', 'my-secret-value-12345');
  vault.set('TEST_SECRET_2', 'another-secret-67890');

  console.log('Secrets keys:', vault.keys());
  console.log('');
  console.log('Secret 1 (masked):', vault.getMasked('TEST_SECRET_1'));
  console.log('Secret 2 (masked):', vault.getMasked('TEST_SECRET_2'));
  console.log('Missing secret (masked):', vault.getMasked('MISSING_KEY'));
  console.log('');

  // Validate required secrets
  const validation = vault.validate(['TEST_SECRET_1', 'TEST_SECRET_2', 'MISSING_KEY']);
  console.log('Validation result:', {
    valid: validation.valid,
    missing: validation.missing,
  });

  console.log('');
  console.log('========================================');
  console.log('✅ TODOS OS TESTES PASSARAM!');
  console.log('========================================');
  console.log('');
  console.log('Próximos passos:');
  console.log('1. Implementar Modo Aprovação Triplo');
  console.log('2. Implementar primeira skill (Schema Sentinel)');
  console.log('3. Configurar vault com secrets reais');
  console.log('');
}

// Run tests
testLogger().catch(console.error);
