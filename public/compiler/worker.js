// All assets resolve relative to this worker, including on repository subpaths.
import { API } from './vendor/clang.js';
import { WASI, ConsoleStdout, File, OpenFile, wasi as constants } from './vendor/wasi/index.js';

const assets = {
  'clang22-noeh': ['clang22-noeh.gz', 13505729, 36100574],
  'lld22-noeh': ['lld22-noeh.gz', 7627950, 19183252],
  'sysroot22.tar': ['sysroot22.tar.gz', 6780522, 39876608],
  iostream: ['iostream.h', 1707],
  memfs: ['memfs.wasm', 97104],
};
const total = Object.values(assets).reduce((sum, [, size]) => sum + size, 0);
const encoder = new TextEncoder();
const status = (status, detail, progress) => self.postMessage({ type: 'status', status, detail, progress });
let cached, busy = false;

async function initialize() {
  let received = 0, previous = -1;
  const versionDirectory = new URL('./v1/', import.meta.url);
  const entries = await Promise.all(Object.entries(assets).map(async ([name, [filename, size, expectedSize = size]]) => {
    const url = new URL(filename, versionDirectory);
    let stage = 'fetch';
    try {
      const response = await fetch(url, { cache: 'force-cache' });
      if (!response.ok || !response.body) throw Error('HTTP ' + response.status);
      stage = 'read';
      const reader = response.body.getReader();
      const chunks = [];
      let downloaded = 0, progressSize = size;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value.byteLength === 0) continue;
        if (downloaded === 0 && filename.endsWith('.gz') && value[0] !== 0x1f) {
          progressSize = expectedSize;
        }
        chunks.push(value);
        received += Math.min(value.byteLength, Math.max(0, progressSize - downloaded)) * size / progressSize;
        downloaded += value.byteLength;
        const percent = Math.min(100, Math.floor((received + 0.001) * 100 / total));
        if (percent !== previous) {
          previous = percent;
          status('Loading', 'Downloading toolchain', percent);
        }
      }
      const file = new Blob(chunks);
      const prefix = new Uint8Array(await file.slice(0, 4).arrayBuffer());
      let bytes;
      // Static hosts may set Content-Encoding: gzip. Fetch already decompresses those bodies.
      if (filename.endsWith('.gz') && prefix[0] === 0x1f && prefix[1] === 0x8b) {
        stage = 'decompress';
        bytes = await new Response(file.stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
      } else {
        bytes = await file.arrayBuffer();
      }
      const wasm = !['sysroot22.tar', 'iostream'].includes(name);
      stage = wasm ? 'validate WebAssembly' : 'validate data';
      if (bytes.byteLength !== expectedSize) {
        throw Error('Expected ' + expectedSize + ' bytes, received ' + bytes.byteLength + '. Check the hosting path and compression settings.');
      }
      return [name, wasm ? await WebAssembly.compile(bytes) : bytes];
    } catch (cause) {
      throw Error('Could not ' + stage + ' ' + url.pathname + ': ' + cause.message);
    }
  }));
  return Object.fromEntries(entries);
}

async function compile(source, modules) {
  // Fresh memfs for every translation unit. Only immutable modules and headers are shared.
  const api = new API({
    readBuffer: async (name) => modules[name],
    compileStreaming: async (name) => modules[name],
    hostWrite() {},
    clang: 'clang22-noeh', lld: 'lld22-noeh', sysroot: 'sysroot22.tar',
    clangResourceInclude: '/lib/clang/22/include',
    clangExtraArgs: ['-std=c++20', '-internal-isystem', '/include/wasm32-wasip1/noeh/c++/v1',
      '-internal-isystem', '/include/wasm32-wasip1'],
    lldLibdir: 'lib/wasm32-wasip1',
    lldFlags: ['--max-memory=67108864'],
    lldLibs: ['-lc', '-lc++', '-lc++abi', '-lclang_rt.builtins']
  });
  await api.ready;
  // The release ships an AST teaching header. Restore the matching SDK's complete libc++ streams.
  api.memfs.addFile('include/wasm32-wasip1/noeh/c++/v1/iostream', modules.iostream);
  let diagnostics = '';
  api.memfs.hostWrite = (text) => {
    diagnostics += text.replace(/\x1b\[[\d;]*m/g, '');
    if (diagnostics.length > 65536) throw Error('Compiler diagnostic limit reached.');
  };
  try {
    api.memfs.addFile('main.cpp', source);
    await api.run(modules['clang22-noeh'], 'clang', '-cc1', '-emit-obj', ...api.clangCommonArgs,
      '-O0', '-o', 'main.o', '-x', 'c++', 'main.cpp');
    await api.link('main.o', 'main.wasm');
    if (diagnostics.trim()) self.postMessage({ type: 'output', stream: 'stderr', text: diagnostics });
    return await WebAssembly.compile(api.memfs.getFileContents('main.wasm'));
  } catch (error) {
    throw Object.assign(Error('Compilation failed.'), { diagnostics: diagnostics.trim() || error.message });
  }
}

async function execute(module, stdin) {
  let written = 0, pending = '', stream = '', last = -Infinity, packets = 0;
  const flush = () => {
    if (!pending) return;
    const text = pending;
    pending = '';
    if (++packets > 1024) throw Error('Program exceeded the console message limit.');
    self.postMessage({ type: 'output', stream, text });
    last = performance.now();
  };
  const channels = ['stdout', 'stderr'].map((name) => {
    const decoder = new TextDecoder();
    const append = (text) => {
      if (name !== stream) flush();
      stream = name;
      pending += text;
      if (pending.length >= 4096 || performance.now() - last > 60) flush();
    };
    const fd = new ConsoleStdout((bytes) => {
      const remaining = Math.max(0, 65536 - written);
      written += bytes.length;
      append(decoder.decode(bytes.subarray(0, remaining), { stream: true }));
      if (written > 65536) throw Error('Program output exceeded 64 KiB.');
    });
    return { fd, finish() { const tail = decoder.decode(); if (tail) append(tail); } };
  });
  const input = new OpenFile(new File(encoder.encode(stdin), { readonly: true }));
  // OpenFile's allocation methods bypass its readonly flag; stdin has no resize rights.
  input.fd_allocate = input.fd_filestat_set_size = () => constants.ERRNO_BADF;
  const fds = [input, ...channels.map(c => c.fd)];
  const wasi = new WASI(['main'], [], fds);
  try {
    const instance = await WebAssembly.instantiate(module, { wasi_snapshot_preview1: wasi.wasiImport });
    return wasi.start(instance);
  } finally {
    channels.forEach(c => c.finish());
    flush();
  }
}

self.onmessage = async ({ data: { source, stdin } }) => {
  if (busy) return;
  busy = true;
  let compileStart, compileMs, runStart;
  try {
    if (encoder.encode(source).length > 131072) throw Error('Source exceeds 128 KiB.');
    if (encoder.encode(stdin).length > 65536) throw Error('Input exceeds 64 KiB.');
    status('Loading', 'Initializing compiler');
    cached ??= initialize().catch(error => { cached = undefined; throw error; });
    const modules = await cached;
    status('Compiling', 'Compiling and linking main.cpp');
    compileStart = performance.now();
    const program = await compile(source, modules);
    compileMs = performance.now() - compileStart;
    status('Running', 'Executing WebAssembly');
    runStart = performance.now();
    const exitCode = await execute(program, stdin);
    self.postMessage({ type: 'done', exitCode, compileMs, runMs: performance.now() - runStart });
  } catch (error) {
    self.postMessage({ type: 'error', message: error.message, diagnostics: error.diagnostics,
      compileMs: compileMs ?? (compileStart === undefined ? undefined : performance.now() - compileStart),
      runMs: runStart === undefined ? undefined : performance.now() - runStart });
  } finally {
    busy = false;
  }
};
