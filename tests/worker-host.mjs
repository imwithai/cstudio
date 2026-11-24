// Node-only test adapter. The production worker uses standard browser APIs.
import { parentPort } from 'node:worker_threads';
import { readFile } from 'node:fs/promises';
globalThis.self = globalThis;
self.postMessage = message => parentPort.postMessage(message);
globalThis.fetch = async url => {
  parentPort.postMessage({ type: 'asset', name: url.pathname.split('/').pop() });
  return new Response(await readFile(url));
};
await import('../public/compiler/worker.js');
parentPort.on('message', data => self.onmessage({ data }));
