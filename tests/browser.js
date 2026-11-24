import { verifyCompiler } from './suite.js';
const log = document.querySelector('#log');
const button = document.querySelector('#run');
const print = (s) => { log.textContent += s + '\n'; };
function newWorker() {
  return new Worker(new URL('./observe.worker.js', import.meta.url), {type: 'module'});
}
button.onclick = async () => {
  log.textContent = 'Starting production worker…\n';
  button.disabled = true;
  try { await verifyCompiler(print, newWorker); }
  catch (error) { print('FAIL  ' + error.message); }
  finally { button.disabled = false; }
};
