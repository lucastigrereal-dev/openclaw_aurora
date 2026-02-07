/**
 * Aurora Monitor Daemon
 *
 * Standalone process that runs the Aurora Monitor.
 * This is the entry point for starting the monitoring service.
 *
 * Usage: npx ts-node src/apps/monitor-daemon/index.ts
 */

import { AuroraMonitor } from '../../monitor';

async function main() {
  console.log('🛡️  Aurora Monitor Daemon starting...\n');

  const monitor = new AuroraMonitor({
    checkIntervalMs: 30000,
    alertThreshold: 0.8,
    enableAutoHealing: true,
  });

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n⏹️  Shutting down Aurora Monitor...');
    await monitor.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n⏹️  Shutting down Aurora Monitor...');
    await monitor.stop();
    process.exit(0);
  });

  try {
    await monitor.start();
    console.log('✅ Aurora Monitor running');
    console.log('   Press Ctrl+C to stop\n');
  } catch (error) {
    console.error('❌ Failed to start Aurora Monitor:', error);
    process.exit(1);
  }
}

main();
