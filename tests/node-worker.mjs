import { parentPort, workerData } from 'node:worker_threads';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';

// Supply the DOM worker APIs needed by the unmodified production entry point.
// Alternate HTTP representations across runs to exercise both gzip paths.
globalThis.self = globalThis;
const requests = [];
globalThis.fetch = async (url) => {
  const file = await readFile(url);
  requests.push({name: url.href});
  const decode = workerData.decoded && url.pathname.endsWith('.gz');
  return new Response(decode ? gunzipSync(file) : file);
};
self.postMessage = message => parentPort.postMessage(message);
await import('../dist/compiler/worker.js');
parentPort.on('message', async data => {
  await self.onmessage({data});
  parentPort.postMessage({type:'measurements', assets:requests});
});
