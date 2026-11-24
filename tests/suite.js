function check(ok, message) { if (!ok) throw Error(message); }
function equal(actual, expected) { check(actual === expected, JSON.stringify({ expected, actual })); }

function run(worker, source, stdin = '', stopAfterStart = false) {
  return new Promise((resolve, reject) => {
    let stdout = '', stderr = '', terminal;
    const timeout = setTimeout(() => { worker.terminate(); reject(Error('Worker timed out')); }, 90000);
    worker.onerror = e => { clearTimeout(timeout); reject(Error('Worker load: '+e.message+' '+e.filename)); };
    worker.onmessage = ({data}) => {
      if (data.type === 'status' && data.status === 'Running' && stopAfterStart) {
        setTimeout(() => {
          clearTimeout(timeout);
          worker.terminate();
          if (terminal) reject(Error('The infinite loop exited before Stop'));
          else resolve({ stopped: true });
        }, 200);
      }
      if (data.type === 'output') {
        if (data.stream === 'stdout') stdout += data.text;
        if (data.stream === 'stderr') stderr += data.text;
      }
      if (data.type === 'done' || data.type === 'error') terminal = data;
      if (data.type === 'measurements') {
        clearTimeout(timeout);
        resolve({ ...terminal, stdout, stderr, assets: data.assets });
      }
    };
    worker.postMessage({source, stdin});
  });
}

export async function verifyCompiler(print, newWorker) {
  let worker = newWorker();
  try {
    let initialResources;
    const cases = [
      ['Hello World', '#include <iostream>\nint main(){std::cout<<"Hello, World!\\n";}', '', 'Hello, World!\n', '', 0],
      ['cin, cout and numeric addition', '#include <iostream>\nint main(){int a,b;std::cin>>a>>b;std::cout<<a+b<<std::endl;}', '10 20', '30\n', '', 0],
      ['Multiline input, arrays, loops and functions', '#include <iostream>\nint add(int a,int b){return a+b;} int main(){int a[2][2];for(auto &r:a) for(int &v:r)std::cin>>v; for(auto &r:a)std::cout<<add(r[0],r[1])<<" ";}', '4 6\n-2 7', '10 5 ', '', 0],
      ['STL sorting, stderr and nonzero exit', '#include <iostream>\n#include <vector>\n#include <algorithm>\nint main(){std::vector<int> v={7,9,-3};std::sort(v.begin(),v.end()); for(int a:v)std::cout<<a<<" "; std::cerr<<"message";return 11;}', '', '-3 7 9 ', 'message', 11],
      ['C++20 concepts, map and set', '#include <concepts>\n#include <map>\n#include <set>\ntemplate<std::integral T>T twice(T x){return x+x;} int main(){std::map<int,int> m={{1,6}};std::set<int> s={twice(m.at(1))};return *s.begin();}', '', '', '', 12],
      ['UTF-8 string input', '#include <iostream>\n#include <string>\nint main(){std::string s;std::getline(std::cin,s);std::cout<<s;}', 'Salom, do‘stim! 👋\nignored', 'Salom, do‘stim! 👋', '', 0],
    ];
    for (const [name, source, stdin, stdout, stderr, exit] of cases) {
      const result = await run(worker, source, stdin);
      check(result.type === 'done', result.diagnostics || result.message || 'No completion');
      equal(result.stdout, stdout); equal(result.stderr, stderr); equal(result.exitCode, exit);
      check(Number.isFinite(result.compileMs) && Number.isFinite(result.runMs), 'Missing timing');
      check(result.assets.length >= 5, 'Compiler asset timing entries missing');
      if (!initialResources) initialResources = result.assets.length;
      equal(result.assets.length, initialResources);
      print('PASS  ' + name + ' (' + result.compileMs.toFixed(0) + ' ms compile)');
    }
    print('PASS  Repeated runs use the initialized toolchain without refetching assets.');
    const invalid = await run(worker, 'int main(){\n int n = ;\n}');
    equal(invalid.type,'error'); check(/main.cpp:2:\d+: error:/.test(invalid.diagnostics),invalid.diagnostics);
    print('PASS  Real Clang diagnostics with a source location.');
    const large = await run(worker, '#include <cstdio>\nint main(){for(int i=0;i<66000;i++)putchar(65);}');
    equal(large.type,'error'); check(/64 KiB/.test(large.message), large.message);
    check(large.stdout.length <= 65536, 'Output escaped its limit');
    print('PASS  Excess output capped and terminated.');
    const trap = await run(worker, 'int main(){__builtin_trap();}');
    equal(trap.type,'error'); check(trap.runMs >= 0, 'Missing runtime failure timing');
    print('PASS  WebAssembly trap reported.');
    const stopped = await run(worker, 'int main(){volatile unsigned i=0;for(;;){i=i+1;}}', '', true);
    equal(stopped.stopped,true); print('PASS  Infinite loop terminated.');
    worker = newWorker();
    const recovery = await run(worker, 'int main(){return 23;}');
    equal(recovery.exitCode,23);
    print('PASS  Fresh worker recovers after termination.');
    if (recovery.assets.some(a => typeof a.transferSize === 'number')) {
      const cached = recovery.assets.filter(a => a.decodedBodySize > 0 && a.transferSize === 0);
      print('CACHE  Fresh worker served ' + cached.length + '/' + recovery.assets.length + ' assets with zero transferred bytes (depends on browser cache policy).');
    }
    print('SUITE PASSED');
  } finally { worker.terminate(); }
}
