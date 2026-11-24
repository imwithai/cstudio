import { Worker } from 'node:worker_threads';
import { verifyCompiler } from './suite.js';
let workersCreated = 0;
function createWorker() {
  const nodeWorker = new Worker(new URL('./node-worker.mjs', import.meta.url), {
    workerData: {decoded: ++workersCreated % 2 === 0},
  });
  const adapter = {
    onmessage: null, onerror: null,
    terminate: () => nodeWorker.terminate(),
    postMessage: request => nodeWorker.postMessage(request),
  };
  nodeWorker.on('message', data => adapter.onmessage?.({data}));
  nodeWorker.on('error', error => adapter.onerror?.(error));
  return adapter;
}
await verifyCompiler(console.log, createWorker);
