#!/usr/bin/env bash
# Optional developer operation, run with a local WASI SDK 33 release and basic Unix tools.
set -euo pipefail
: "${WASI_SDK_PATH:?Set WASI_SDK_PATH to the extracted wasi-sdk 33.0 directory}"
project="$(cd "$(dirname "$0")/.." && pwd)"
target="$project/public/compiler/v1"
temp="$(mktemp -d)"
trap 'rm -rf "$temp"' EXIT
mkdir -p "$target"
cd "$temp"
source_repo=https://github.com/cppstudio-io/wasm-clang-runtime
commit=df1180d80184733c6a01599f76b92b4001d20f87
curl -fsSL --retry 3 "https://codeload.github.com/cppstudio-io/wasm-clang-runtime/tar.gz/$commit" | tar -xz
for name in clang22-noeh lld22-noeh sysroot22.tar; do
  curl -fsSL --retry 3 "$source_repo/releases/download/v0.1.0/$name" -o "$name"
done
cat <<'HASHES' | shasum -a 256 -c -
e01346e33b31a3b3359a317450502bd4feb78cd6ca7fed08aca8601f9ff8834d  clang22-noeh
63c397c582e193aacd96fbdeb04b1bd32f47ae505f6dc4a569ed08a80ddfeff7  lld22-noeh
d991c621cdf9b4640c2cd4aa21abb08491c2ae6ef9917cac5c6065553604bcec  sysroot22.tar
HASHES
for name in clang22-noeh lld22-noeh sysroot22.tar; do
  gzip -9nc "$name" > "$temp/$name.gz"
done
cd "wasm-clang-runtime-$commit/src/memfs"
"$WASI_SDK_PATH/bin/clang" --target=wasm32-wasip1 -O2 -c memfs.c -o "$temp/memfs.o"
"$WASI_SDK_PATH/bin/clang" --target=wasm32-wasip1 -DSTB_SPRINTF_IMPLEMENTATION -x c -O2 -c stb_sprintf.h -o "$temp/stb.o"
sysroot="$WASI_SDK_PATH/share/wasi-sysroot"
"$WASI_SDK_PATH/bin/wasm-ld" -L"$sysroot/lib/wasm32-wasip1" --no-entry --export-dynamic --allow-undefined --initial-memory=4194304 -o "$temp/memfs.wasm" "$temp/memfs.o" "$temp/stb.o" -lc
cp "$temp/"*.gz "$temp/memfs.wasm" "$target/"
cp "$sysroot/include/wasm32-wasip1/noeh/c++/v1/iostream" "$target/iostream.h"
