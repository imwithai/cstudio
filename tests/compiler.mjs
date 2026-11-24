import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';

function freshWorker() {
  return new Worker(new URL('./worker-host.mjs', import.meta.url));
}
let worker = freshWorker();
let assetReads = 0;
function run(source, stdin = '', stopWhenRunning = false) {
  return new Promise((resolve, reject) => {
    const text = { stdout: '', stderr: '' };
    const timer = setTimeout(() => fail(Error('Worker timed out')), 120000);
    function cleanup() {
      clearTimeout(timer);
      worker.off('message', receive);
      worker.off('error', fail);
    }
    function fail(error) { cleanup(); reject(error); }
    async function receive(message) {
      if (message.type === 'asset') assetReads++;
      if (message.type === 'output') text[message.stream] += message.text;
      if (message.type === 'status' && message.status === 'Running' && stopWhenRunning) {
        cleanup();
        await new Promise(resolve => setTimeout(resolve, 100));
        await worker.terminate();
        resolve({ stopped: true });
      }
      if (message.type === 'done' || message.type === 'error') {
        cleanup();
        resolve({ ...text, ...message });
      }
    }
    worker.on('message', receive);
    worker.once('error', fail);
    worker.postMessage({ source, stdin });
  });
}

try {
  const cases = [
    ['Hello World', '#include <iostream>\nint main(){std::cout<<"Hello, world!";}', '', 'Hello, world!', '', 0],
    ['stdin', '#include <iostream>\nint main(){int a,b;std::cin>>a>>b;std::cout<<a+b<<std::endl;}', '10 20','30\n','',0],
    ['STL, multiline input, stderr and exit code', '#include <iostream>\n#include <vector>\n#include <algorithm>\nint main(){std::vector<int> v(3);for(int &x:v)std::cin>>x;std::sort(v.begin(),v.end());for(int x:v)std::cout<<x;std::cerr<<"err";return 3;}', '9\n5\n7','579','err',3],
    ['matrix and loops','#include <iostream>\nint main(){int a[2][2]={{1,2},{3,4}};for(auto &row:a)std::cout<<row[0]+row[1]<<" ";}', '', '3 7 ', '', 0],
    ['UTF-8','#include <iostream>\nint main(){std::string s;std::getline(std::cin,s);std::cout<<s;}', 'héllo 😄','héllo 😄','',0],
    ['C++20 concepts','#include <concepts>\ntemplate<std::integral T> T twice(T x){return x+x;} int main(){return twice(2);}', '', '', '', 4]
  ];
  for (const [name, source, stdin, stdout, stderr, exit] of cases) {
    const result = await run(source, stdin);
    assert.equal(result.exitCode, exit, result.diagnostics || result.message);
    assert.equal(result.stdout, stdout);
    assert.equal(result.stderr, stderr);
    assert.ok(result.compileMs > 0 && result.runMs >= 0);
    console.log('PASS', name);
  }
  assert.equal(assetReads, 5);
  console.log('PASS repeated runs reuse initialized compiler modules');
  const invalid = await run('int main(){\n int x = ;\n}');
  assert.match(invalid.diagnostics, /main.cpp:2:\d+: error:/);
  console.log('PASS compiler diagnostics');
  assert.match((await run('int main(){__builtin_trap();}')).message, /unreachable/i);
  console.log('PASS runtime trap');
  const limit = await run('#include <cstdio>\nint main(){for(;;)std::putchar(65);}');
  assert.match(limit.message, /64 KiB/);
  assert.equal(limit.stdout.length, 65536);
  console.log('PASS output limit');
  assert.deepEqual(await run('int main(){volatile int x=0;while(true){x=1;}}','',true), { stopped: true });
  worker = freshWorker();
  assert.equal((await run('int main(){return 7;}')).exitCode, 7);
  console.log('PASS terminate infinite loop and run again');
} finally {
  await worker.terminate();
}
