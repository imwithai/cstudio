import { useCallback, useEffect, useRef, useState } from "react";
import type { Diagnostic, Status, WorkerReply } from "./types";
export function useRunner() {
  const worker = useRef<Worker | null>(null),
    active = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout>>();
  const [status, setStatus] = useState<Status>("Ready"),
    [output, setOutput] = useState(""),
    [detail, setDetail] = useState(""),
    [metrics, setMetrics] = useState(""),
    [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const dispose = useCallback(() => {
    clearTimeout(timer.current);
    worker.current?.terminate();
    worker.current = null;
    active.current = false;
  }, []);
  useEffect(() => dispose, [dispose]);
  const stop = () => {
    dispose();
    setStatus("Stopped");
    setDetail("Worker terminated.");
  };
  const clear = () => {
    setOutput("");
    setMetrics("");
    setDiagnostics([]);
    setDetail("");
    if (!active.current) setStatus("Ready");
  };
  function run(source: string, stdin: string) {
    if (active.current) return;
    clear();
    if (
      new Blob([source]).size > 128 * 1024 ||
      new Blob([stdin]).size > 64 * 1024
    ) {
      setStatus("Error");
      setDetail("Source limit: 128 KiB. Input limit: 64 KiB.");
      return;
    }
    active.current = true;
    setStatus("Loading");
    const fail = (msg: string) => {
      dispose();
      setStatus("Error");
      setDetail(msg);
    };
    const timeout = (ms: number) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(
        () => fail("Time limit reached. The worker was stopped."),
        ms,
      );
    };
    try {
      const w =
        worker.current ??
        new Worker(new URL("compiler/worker.js", document.baseURI), {
          type: "module",
        });
      worker.current = w;
      w.onerror = (e) =>
        fail(e.message || "The compiler worker could not start.");
      w.onmessage = ({ data: d }: MessageEvent<WorkerReply>) => {
        if (!active.current || worker.current !== w) return;
        if (d.type === "status") {
          setStatus(d.status);
          setDetail(
            [
              d.detail,
              typeof d.progress === "number"
                ? Math.round(d.progress) + "%"
                : "",
            ]
              .filter(Boolean)
              .join(" · "),
          );
          timeout(
            d.status === "Running"
              ? 5000
              : d.status === "Compiling"
                ? 60000
                : 180000,
          );
        }
        if (d.type === "output") setOutput((o) => o + d.text);
        if (d.type === "done" || d.type === "error") {
          clearTimeout(timer.current);
          active.current = false;
          setStatus(
            d.type === "done" && d.exitCode === 0 ? "Success" : "Error",
          );
          setDetail(d.message || "");
          setMetrics(
            [
              d.compileMs != null
                ? "Compile " + d.compileMs.toFixed(1) + " ms"
                : "",
              d.runMs != null ? "Run " + d.runMs.toFixed(1) + " ms" : "",
              d.exitCode != null ? "Exit " + d.exitCode : "",
            ]
              .filter(Boolean)
              .join("   ·   "),
          );
          const diagnostics = d.diagnostics;
          if (diagnostics) {
            setOutput((o) => (o.includes(diagnostics) ? o : o + diagnostics));
            const matches = String(d.diagnostics).matchAll(
              /\bmain\.cpp:([0-9]+):([0-9]+):\s*(error|warning|note|fatal error):\s*([^\n]+)/g,
            );
            setDiagnostics(
              Array.from(matches, (m) => ({
                line: +m[1],
                column: +m[2],
                message: m[4],
                severity:
                  m[3] === "warning"
                    ? "warning"
                    : m[3] === "note"
                      ? "note"
                      : "error",
              })),
            );
          }
          if (d.type === "error") dispose();
        }
      };
      timeout(180000);
      w.postMessage({ source, stdin });
    } catch (e) {
      fail(String(e));
    }
  }
  return {
    run,
    stop,
    clear,
    status,
    output,
    detail,
    metrics,
    diagnostics,
    busy: ["Loading", "Running", "Compiling"].includes(status),
  };
}
