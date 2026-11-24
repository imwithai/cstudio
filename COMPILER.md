# Browser compiler

The distribution includes all five files in `public/compiler/v1`. Vite copies the directory verbatim to `dist/compiler/v1`. A normal checkout or ZIP needs no toolchain installation. Serve the files on the same origin as the editor with HTTP 200 and the correct body. The three `.gz` files are gzip archives decoded in the worker. The worker checks the gzip signature and accepts both raw archives and bodies already decoded by HTTP `Content-Encoding: gzip`. File names resolve relative to the worker and work under a repository subdirectory.

The ESM worker loads 26.7 MiB of toolchain assets on first Run. The editor loads independently. Downloads use the HTTP cache and the worker keeps immutable compiled modules and headers in memory between runs. Each compilation gets a new compiler filesystem. Each program gets a separate WASI instance, read-only UTF-8 stdin, stdout, and stderr. No guest directories, network services, environment variables or browser APIs are supplied.

## Provenance

- Compiler and linker are the Clang/LLD 22.1.8 no-EH binaries from [wasm-clang-runtime v0.1.0](https://github.com/cppstudio-io/wasm-clang-runtime/releases/tag/v0.1.0). The script below verifies their upstream SHA-256 digests and the sysroot digest before compression.
- The compiler host is the upstream [shared.js](https://github.com/cppstudio-io/wasm-clang-runtime/blob/df1180d80184733c6a01599f76b92b4001d20f87/src/shared.js) with an ES module export and fixed directory stat handling. Its memfs companion was built from the same commit using WASI SDK 33.0. See [upstream build notes](https://github.com/cppstudio-io/wasm-clang-runtime/blob/df1180d80184733c6a01599f76b92b4001d20f87/docs/build-notes.md).
- Upstream's teaching sysroot replaces the standard iostream implementation. The worker restores the genuine matching header from [WASI SDK 33](https://github.com/WebAssembly/wasi-sdk/releases/tag/wasi-sdk-33) before compiling, so stream formatting, extraction, getline, and stderr use libc++.
- Programs run with [@bjorn3/browser_wasi_shim 0.4.2](https://www.npmjs.com/package/@bjorn3/browser_wasi_shim/v/0.4.2). Its published ESM files are vendored for self-hosting. Compiler and WASI notices are in `public/compiler/licenses/`.

## Verify or regenerate

From the project root, Node 22.12+ can exercise the same compiler, linker, byte streams, executable modules and WASI adapter used by the browser. The test driver supplies a local file reader and worker-thread transport.

```sh
shasum -a 256 -c scripts/compiler-sha256.txt
node tests/compiler.mjs
```

Only to regenerate compiler assets, download the WASI SDK 33.0 release for your build machine, extract it, and supply its absolute path. For example, on an Apple Silicon Mac after extracting the SDK into Downloads:

```sh
WASI_SDK_PATH="$HOME/Downloads/wasi-sdk-33.0-arm64-macos" bash scripts/rebuild-compiler.sh
node tests/compiler.mjs
```

The SDK is a build-time dependency for that optional operation. Deterministic gzip uses the system gzip tool and may differ byte-for-byte across implementations. If deliberately replacing the runtime, version its URL directory, update the compressed transfer sizes in the worker, and regenerate the checksum manifest.

## Scope

The target is single-file C++20 for wasm32-wasip1, with libc++ and wasi-libc. Language mode does not imply every hosted C++ library or operating-system feature is available. The sysroot has no exception-handling runtime, threads, GUI, sockets, subprocesses, or GNU libstdc++ convenience headers such as `bits/stdc++.h`. Input is a finite byte stream supplied before Run and reads EOF once exhausted. Current browsers need WebAssembly, module workers, Fetch streams, BigInt, and DecompressionStream. Compiling a large program can exhaust a mobile tab's available memory.

The worker enforces 128 KiB source, 64 KiB stdin, and 64 KiB combined output and a maximum of 1,024 streamed console messages. The linker caps guest linear memory at 64 MiB. The compiler itself needs substantially more memory, and browser-managed memory, stack, JIT, and tab-wide resources do not have a portable hard quota. Compile time includes constructing the temporary filesystem, compiling, linking and WebAssembly validation. Run time includes WASI instantiation and execution. Initial toolchain download and initialization precede both measurements.
