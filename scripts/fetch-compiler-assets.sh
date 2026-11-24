#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
base="https://github.com/cppstudio-io/wasm-clang-runtime/releases/download/v0.1.0"
mkdir -p public/compiler/v1
download() {
  name="$1"
  expected="$2"
  path="public/compiler/v1/${name}.gz"
  if [[ -f "$path" ]]; then
    echo "Bundled $path already exists"
    return
  fi
  tmp="$(mktemp)"
  trap 'rm -f "$tmp"' RETURN
  curl --fail --location --retry 3 --silent --show-error "$base/$name" --output "$tmp"
  actual="$(wc -c < "$tmp" | tr -d ' ')"
  [[ "$actual" == "$expected" ]] || { echo "Invalid download: $name ($actual bytes)" >&2; exit 1; }
  gzip -n -9 -c "$tmp" > "$path"
  echo "Prepared $path"
  rm -f "$tmp"
  trap - RETURN
}
download clang22-noeh 36100574
download lld22-noeh 19183252
download sysroot22.tar 39876608
