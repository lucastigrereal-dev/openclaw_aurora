import assert from 'assert';
import { loadSocialHubConfig } from './skills/social-hub-config';

function testPublerKeyHasNoHardcodedFallback(): void {
  const previous = process.env.PUBLER_API_KEY;
  try {
    delete process.env.PUBLER_API_KEY;
    const config = loadSocialHubConfig();
    assert.strictEqual(config.publisherApiKey, '', 'PUBLER_API_KEY must be empty when env is unset');
  } finally {
    if (previous === undefined) delete process.env.PUBLER_API_KEY;
    else process.env.PUBLER_API_KEY = previous;
  }
}

testPublerKeyHasNoHardcodedFallback();
console.log('Social Hub config security test passed');
