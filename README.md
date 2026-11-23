# C++ Studio

A free, frontend-only online C++ IDE with Monaco Editor, Clang WebAssembly and browser-side execution.

This repository is being prepared for GitHub Pages. The online compiler is based on `@live-codes/clang-wasm` and the site runs without a backend.

## Deployment

The `main` branch deploys through `.github/workflows/deploy.yml`. GitHub Pages must use the **GitHub Actions** source under **Settings → Pages**.

## Local development

```bash
npm install
npm run dev
```

**Note:** The first browser compiler launch fetches approximately 29 MB of WebAssembly toolchain assets. Input and output stay in the browser.
