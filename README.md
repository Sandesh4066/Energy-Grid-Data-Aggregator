# EnergyGrid Data Aggregator - Solution

## Instructions to Run

### Prerequisites
- Node.js (v14 or higher)
- Mock API server running on localhost:3000

### Setup
1. No installation needed - uses only Node.js built-in modules (crypto, http)

### Running the Solution
run the 'test.js' with 'node server.js" you will see "EnergyGrid Mock API running on port 3000" after that run "npm start" 

The client will:
- Generate 500 serial numbers (SN-000 to SN-499)
- Fetch data from all 500 devices in batches of 10
- Display progress in real-time
- Save results to `aggregated-data.json`

Expected execution time: ~50 seconds (due to 1 req/sec rate limit)

## Approach

### Rate Limiting
- **Sequential Processing**: Processes batches one at a time
- **Timing Control**: Measures request duration and waits remaining time to ensure exactly 1 second between requests
- **Implementation**: `const waitTime = Math.max(0, 1000 - elapsed); await sleep(waitTime);`

### Concurrency
- **No Parallel Requests**: Strictly sequential to avoid rate limit violations
- **Batch Processing**: Groups 10 devices per request (maximum allowed)
- **Optimal Throughput**: 500 devices ÷ 10 per batch = 50 requests × 1 second = 50 seconds minimum

### Error Handling
- **Retry Logic**: Up to 3 retry attempts with 2-second delay
- **Graceful Degradation**: Continues processing remaining batches if one fails
- **Network Error Handling**: Catches and logs all request errors

### Security
- **Signature Generation**: MD5(URL + Token + Timestamp) for each request
- **Fresh Timestamps**: Unique timestamp per request to prevent replay attacks
- **Header Validation**: Includes required `signature` and `timestamp` headers


## Code Structure

- `generateSignature()` - Creates MD5 authentication signature
- `generateSerialNumbers()` - Generates device serial numbers
- `createBatches()` - Splits devices into batches of 10
- `makeRequest()` - Handles HTTP POST with proper headers
- `makeRequestWithRetry()` - Implements retry logic
- `processBatches()` - Orchestrates batch processing with rate limiting
- `generateSummary()` - Aggregates statistics from device data
- `main()` - Entry point that coordinates the entire flow

## Data
- I have Uploaded the Aggregated data in this GitHub Repo
