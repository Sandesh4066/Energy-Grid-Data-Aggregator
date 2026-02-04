

const { generateSignature, generateSerialNumbers, createBatches } = require('./client');
const crypto = require('crypto');

console.log(' Running Tests...\n');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(` ${name}`);
    passedTests++;
  } catch (error) {
    console.log(` ${name}`);
    console.log(`   Error: ${error.message}`);
  }
}


test('Signature generation produces MD5 hash', () => {
  const url = '/device/real/query';
  const token = 'interview_token_123';
  const timestamp = '1234567890';

  const signature = generateSignature(url, timestamp);
  const expected = crypto.createHash('md5')
    .update(url + token + timestamp)
    .digest('hex');

  if (signature !== expected) {
    throw new Error(`Expected ${expected}, got ${signature}`);
  }
});


test('Signature is deterministic (same inputs = same output)', () => {
  const sig1 = generateSignature('/test', '123');
  const sig2 = generateSignature('/test', '123');

  if (sig1 !== sig2) {
    throw new Error('Signatures should be identical for same inputs');
  }
});


test('Generate correct number of serial numbers', () => {
  const sns = generateSerialNumbers(500);
  if (sns.length !== 500) {
    throw new Error(`Expected 500, got ${sns.length}`);
  }
});


test('Serial numbers have correct format', () => {
  const sns = generateSerialNumbers(10);
  if (sns[0] !== 'SN-000' || sns[9] !== 'SN-009') {
    throw new Error(`Expected SN-000 to SN-009, got ${sns[0]} to ${sns[9]}`);
  }
});


test('Create correct number of batches', () => {
  const items = Array.from({ length: 500 }, (_, i) => i);
  const batches = createBatches(items, 10);

  if (batches.length !== 50) {
    throw new Error(`Expected 50 batches, got ${batches.length}`);
  }
});


test('All batches have correct size', () => {
  const items = Array.from({ length: 500 }, (_, i) => i);
  const batches = createBatches(items, 10);

  for (const batch of batches) {
    if (batch.length !== 10) {
      throw new Error(`Expected batch size 10, got ${batch.length}`);
    }
  }
});


test('Handle uneven batch division correctly', () => {
  const items = Array.from({ length: 25 }, (_, i) => i);
  const batches = createBatches(items, 10);

  if (batches.length !== 3) {
    throw new Error(`Expected 3 batches, got ${batches.length}`);
  }

  if (batches[2].length !== 5) {
    throw new Error(`Last batch should have 5 items, got ${batches[2].length}`);
  }
});


test('Batching preserves all data', () => {
  const items = Array.from({ length: 500 }, (_, i) => `item-${i}`);
  const batches = createBatches(items, 10);

  const flattened = batches.flat();
  if (flattened.length !== items.length) {
    throw new Error(`Expected ${items.length} items, got ${flattened.length}`);
  }
});

console.log('\n' + '='.repeat(50));
console.log(`Test Results: ${passedTests}/${totalTests} passed`);
console.log('='.repeat(50));

if (passedTests === totalTests) {
  console.log('\n All tests passed! The client is ready to run.\n');
  process.exit(0);
} else {
  console.log('\n  Some tests failed. Please review the errors above.\n');
  process.exit(1);
}
