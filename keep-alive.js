/**
 * Keep server alive
 */
require('dotenv').config();
require('./dist/start-all.js');

// Keep process alive
process.on('SIGINT', () => {
  console.log('\n[Keep-Alive] Exiting...');
  process.exit(0);
});

console.log('[Keep-Alive] Server running. Press Ctrl+C to stop.');
