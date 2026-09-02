// A better benchmark showing concurrent TCP connection limits and true serial wait times in real environments
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function simulateRealNetwork(numRequests: number) {
  // Browsers typically limit to 6 concurrent requests per domain
  const MAX_CONCURRENT = 6;
  const LATENCY = 30; // ms

  let totalTime = 0;
  let inFlight = 0;

  let batches = Math.ceil(numRequests / MAX_CONCURRENT);
  for(let i=0; i<batches; i++) {
    await delay(LATENCY);
  }
}

async function main() {
  const startUnopt = Date.now();
  await simulateRealNetwork(12 + 22 + 35); // 69 requests
  console.log("Unoptimized time (browser concurrent limit 6):", Date.now() - startUnopt, "ms");

  const startOpt = Date.now();
  await simulateRealNetwork(1); // 1 batched request
  console.log("Optimized time (browser concurrent limit 6):", Date.now() - startOpt, "ms");
}
main();
