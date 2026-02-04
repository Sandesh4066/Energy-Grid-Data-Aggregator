const crypto = require('crypto');
const http = require('http');

const CONFIG = {
  baseUrl: 'http://localhost:3000',
  endpoint: '/device/real/query',
  token: 'interview_token_123',
  totalDevices: 500,
  batchSize: 10,
  requestInterval: 1000,
  maxRetries: 3,
  retryDelay: 2000
};

function generateSignature(url, timestamp) {
  const payload = url + CONFIG.token + timestamp;
  return crypto.createHash('md5').update(payload).digest('hex');
}

function generateSerialNumbers(count) {
  return Array.from({ length: count }, (_, i) =>
    `SN-${String(i).padStart(3, '0')}`
  );
}

function createBatches(array, size) {
  const batches = [];
  for (let i = 0; i < array.length; i += size) {
    batches.push(array.slice(i, i + size));
  }
  return batches;
}

async function makeRequest(serialNumbers) {
  const timestamp = Date.now().toString();
  const signature = generateSignature(CONFIG.endpoint, timestamp);

  const requestData = JSON.stringify({ sn_list: serialNumbers });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: CONFIG.endpoint,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(requestData),
      'timestamp': timestamp,
      'signature': signature
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject({
            statusCode: res.statusCode,
            message: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(requestData);
    req.end();
  });
}

async function makeRequestWithRetry(serialNumbers, retryCount = 0) {
  try {
    const response = await makeRequest(serialNumbers);
    return response;
  } catch (error) {
    if (retryCount < CONFIG.maxRetries) {
      console.log(`    Request failed (attempt ${retryCount + 1}/${CONFIG.maxRetries}). Retrying...`);
      await sleep(CONFIG.retryDelay);
      return makeRequestWithRetry(serialNumbers, retryCount + 1);
    }
    throw error;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processBatches(batches) {
  const allResults = [];
  const totalBatches = batches.length;

  console.log(`\n Processing ${totalBatches} batches (${CONFIG.totalDevices} devices total)\n`);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const startTime = Date.now();

    try {
      console.log(` Batch ${i + 1}/${totalBatches}: Querying ${batch.length} devices...`);

      const response = await makeRequestWithRetry(batch);
      allResults.push(...response.data);

      const elapsed = Date.now() - startTime;
      console.log(`    Success (${elapsed}ms)`);

      if (i < batches.length - 1) {
        const waitTime = Math.max(0, CONFIG.requestInterval - elapsed);
        if (waitTime > 0) {
          await sleep(waitTime);
        }
      }

    } catch (error) {
      console.error(`    Batch ${i + 1} failed:`, error.message || error);
    }
  }

  return allResults;
}

function generateSummary(devices) {
  const onlineDevices = devices.filter(d => d.status === 'Online').length;
  const offlineDevices = devices.filter(d => d.status === 'Offline').length;

  const totalPower = devices
    .filter(d => d.status === 'Online')
    .reduce((sum, d) => sum + parseFloat(d.power), 0);

  return {
    totalDevices: devices.length,
    online: onlineDevices,
    offline: offlineDevices,
    totalPowerGeneration: totalPower.toFixed(2) + ' kW',
    averagePowerPerDevice: (totalPower / onlineDevices).toFixed(2) + ' kW',
    successRate: ((devices.length / CONFIG.totalDevices) * 100).toFixed(1) + '%'
  };
}

function saveResults(data, filename) {
  const fs = require('fs');
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  console.log(`\n Results saved to ${filename}`);
}

async function main() {
  console.log(' EnergyGrid Data Aggregator Client');
  console.log('=====================================\n');
  console.log(`Configuration:`);
  console.log(`  - API Endpoint: ${CONFIG.baseUrl}${CONFIG.endpoint}`);
  console.log(`  - Total Devices: ${CONFIG.totalDevices}`);
  console.log(`  - Batch Size: ${CONFIG.batchSize}`);
  console.log(`  - Rate Limit: 1 request/second`);
  console.log(`  - Max Retries: ${CONFIG.maxRetries}`);

  const startTime = Date.now();

  console.log(`\n Generating ${CONFIG.totalDevices} serial numbers...`);
  const serialNumbers = generateSerialNumbers(CONFIG.totalDevices);

  const batches = createBatches(serialNumbers, CONFIG.batchSize);
  console.log(` Created ${batches.length} batches of ${CONFIG.batchSize} devices each`);

  const results = await processBatches(batches);

  const summary = generateSummary(results);
  const executionTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n' + '='.repeat(50));
  console.log(' AGGREGATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total Devices Queried:  ${summary.totalDevices}`);
  console.log(`Online Devices:         ${summary.online}`);
  console.log(`Offline Devices:        ${summary.offline}`);
  console.log(`Total Power Output:     ${summary.totalPowerGeneration}`);
  console.log(`Avg Power/Device:       ${summary.averagePowerPerDevice}`);
  console.log(`Success Rate:           ${summary.successRate}`);
  console.log(`Execution Time:         ${executionTime}s`);
  console.log('='.repeat(50) + '\n');

  const output = {
    summary,
    executionTime: executionTime + 's',
    timestamp: new Date().toISOString(),
    devices: results
  };

  saveResults(output, 'aggregated-data.json');

  console.log(' Data aggregation complete!\n');
}

if (require.main === module) {
  main().catch(error => {
    console.error('\n Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { generateSignature, generateSerialNumbers, createBatches };
