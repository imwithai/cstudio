// Use the shipped worker unchanged. Report the real worker's Resource Timing
// entries separately, so instrumentation does not enter the application bundle.
import '../dist/compiler/worker.js';
const handle = self.onmessage;
self.onmessage = async (event) => {
  await handle(event);
  const assets = performance.getEntriesByType('resource')
    .filter(entry => entry.name.includes('/compiler/v1/'))
    .map(({ name, transferSize, decodedBodySize }) => ({ name, transferSize, decodedBodySize }));
  self.postMessage({ type: 'measurements', assets });
};
