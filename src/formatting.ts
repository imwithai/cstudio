import * as monaco from "monaco-editor/esm/vs/editor/editor.api";

export function registerFormatting() {
  monaco.languages.registerDocumentFormattingEditProvider("cpp", {
    displayName: "ClangFormat",
    provideDocumentFormattingEdits(model, options, token) {
      if (model.getValueLength() > 256 * 1024)
        throw new Error("Formatting is limited to 256 KiB of source.");
      if (token.isCancellationRequested) return [];
      const version = model.getVersionId();
      const source = model.getValue();
      return new Promise<monaco.languages.TextEdit[]>((resolve, reject) => {
        const worker = new Worker(
          new URL("./formatter.worker.ts", import.meta.url),
          { type: "module" },
        );
        function cleanup() {
          worker.terminate();
          clearTimeout(timer);
          cancellation.dispose();
        }
        const timer = setTimeout(() => {
          cleanup();
          reject(new Error("ClangFormat timed out."));
        }, 60000);
        const cancellation = token.onCancellationRequested(() => {
          cleanup();
          resolve([]);
        });
        worker.onmessage = ({
          data,
        }: MessageEvent<{ text?: string; error?: string }>) => {
          cleanup();
          if (data.error || typeof data.text !== "string")
            return reject(new Error(data.error || "ClangFormat failed."));
          if (
            model.isDisposed() ||
            model.getVersionId() !== version ||
            source === data.text
          )
            return resolve([]);
          resolve([{ range: model.getFullModelRange(), text: data.text }]);
        };
        worker.onerror = (event) => {
          cleanup();
          reject(new Error(event.message || "Unable to start ClangFormat."));
        };
        worker.postMessage({
          source,
          tabSize: options.tabSize,
          insertSpaces: options.insertSpaces,
        });
      });
    },
  });
}
