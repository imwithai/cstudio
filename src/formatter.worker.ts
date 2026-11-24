import init, { format } from "@wasm-fmt/clang-format/web";
import wasmUrl from "@wasm-fmt/clang-format/clang-format.wasm?url";

self.onmessage = async ({
  data,
}: MessageEvent<{
  source: string;
  tabSize: number;
  insertSpaces: boolean;
}>) => {
  try {
    await init(wasmUrl);
    const style = JSON.stringify({
      BasedOnStyle: "LLVM",
      IndentWidth: data.tabSize,
      UseTab: data.insertSpaces ? "Never" : "ForIndentation",
      AllowShortFunctionsOnASingleLine: "Empty",
    });
    self.postMessage({ text: format(data.source, "main.cpp", style) });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
