# C++ Studio

A single-file C++20 workbench that runs entirely in the browser. Clang compiles the editor contents, LLD links a WebAssembly executable, and a WASI host runs it in a dedicated worker. The IDE has no server-side execution, accounts, or source persistence. Refreshing discards the editor contents and input.

## Run locally

Install Node.js 22.12 or newer and npm. From this directory:

```sh
npm install
npm run dev
```

Open the local address printed by Vite. Press **Run code** or **Ctrl/Cmd + Enter**. The initial program reads `10 20` and prints `30`. Open **Examples** for Hello World, vector sorting, and a matrix exercise.

## Build and test

```sh
npm run check
npm test
npm run build
npm run preview
```

For the offline test against the built worker, run `node tests/node.mjs` after the build.

Open the preview address printed by Vite to use the compiled application. For the browser integration suite, keep the production build, run `npm run dev`, visit `/tests/browser.html`, and select **Run compiler tests**. The browser suite uses the built worker under `/dist/compiler/`. It checks real executable output, both streams, nonzero exits, Unicode, compiler diagnostics, traps, repeated runs, termination and recovery. It reports the browser's observed cache transfers. The Node test uses the same WebAssembly binaries and WASI adapter through a worker-thread transport.

## Static deployment

- **Cloudflare Pages** — select the project directory, set the build command to `npm run build`, and set the output directory to `dist`. Use Node 22.12 or newer. Immutable cache headers are included for the versioned toolchain and Vite's hashed assets.
- **GitHub Pages** — build with `npm ci && npm run build`. Publish the **contents** of `dist/` using a Pages deployment artifact or a dedicated publishing branch. For branch-based publishing, include an empty `.nojekyll` in the publishing root. Vite uses relative URLs, so a repository subpath is supported.
- **Other static hosting** — copy all of `dist/` to one directory on an HTTPS origin. Keep `assets/` and `compiler/` beside `index.html`. Serve JavaScript modules with a JavaScript MIME type and `.wasm` as `application/wasm`. Do not open the HTML through a file URL. Node is only needed for development and building.

The compiler binaries and sysroot are bundled. A fresh checkout needs no SDK, API key, asset download script or CDN configuration. See [COMPILER.md](COMPILER.md) for the pinned upstream revision, fixes, checksum verification, regeneration commands, and licenses. The first Run loads approximately 26.7 MiB of compressed compiler assets. Later runs reuse an initialized worker. After Stop, reload, or a failure, a fresh worker can reuse HTTP-cached assets subject to browser policy.

## Editing

Monaco supplies a C++ tokenizer, configurable font size, minimap, line numbers, wrap, bracket matching and light/dark themes. Type a prefix or press Ctrl+Space for snippets, standard headers, functions and local identifiers. Tab advances through snippet fields. Completion uses lexical context and a curated catalog. Type checking and source markers come from Clang when you run the file. Click a diagnostic in Output to jump to its location. Use the editor context menu's **Format Document** action to load clang-format on demand.

Drag the handle below the editor to resize it, or focus the handle and use the arrow keys. Reset restores both the initial program and its input. Choosing an example replaces both. Copy and Clear operate on the console.

## Execution model and limits

Input is a finite UTF-8 byte stream prepared before execution. Reads past its end return EOF. The console combines stdout and stderr in write order and reports measured compile/run times and the exit status when one exists. A trap or force-terminated worker has no normal exit code.

| Resource | Limit |
| --- | --- |
| Source | 128 KiB |
| Standard input | 64 KiB |
| Combined program output | 64 KiB |
| Executable linear memory | 64 MiB |
| Compilation | 60 seconds |
| Execution | 5 seconds |
| Toolchain loading | 180 seconds without progress |

Stop terminates the worker, including a synchronous infinite loop. Generated programs receive only the WASI imports and descriptors provisioned by the host. The toolchain targets wasm32-wasip1 with libc++; threads, native OS APIs, sockets, external files, GUI, GNU-specific headers and C++ exception handling are outside this build's scope. Browser memory pressure can still terminate a tab, especially on phones. Use a modern browser with module workers, WebAssembly, streams and gzip decompression support.

## Source map

- `src/` — React UI, editor, settings, examples, completion and formatting providers, and worker lifecycle.
- `public/compiler/worker.js` — lazy asset loading, compilation, linking, WASI execution and stream limits.
- `public/compiler/v1/`, `vendor/`, `licenses/` under the compiler directory — versioned binaries, runtime host code and notices.
- `scripts/` — optional toolchain rebuild and integrity verification.
- `tests/` — executable integration tests for Node and the browser.
