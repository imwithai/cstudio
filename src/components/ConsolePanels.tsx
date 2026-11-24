import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Copy, CornerDownLeft, Terminal, Trash2 } from "lucide-react";
import { IconButton } from "./IconButton";
import type { Diagnostic, Status } from "../types";

export interface InputHandle {
  getValue(): string;
  setValue(value: string): void;
}
export const InputPanel = forwardRef<InputHandle, { initial: string }>(
  function InputPanel({ initial }, ref) {
    const input = useRef<HTMLTextAreaElement>(null);
    const [bytes, setBytes] = useState(new Blob([initial]).size);
    useImperativeHandle(
      ref,
      () => ({
        getValue: () => input.current?.value ?? "",
        setValue(value) {
          if (input.current) input.current.value = value;
          setBytes(new Blob([value]).size);
        },
      }),
      [],
    );
    return (
      <section className="panel iopanel">
        <div className="panelhead">
          <span className="tile purple">
            <CornerDownLeft size={18} />
          </span>
          <h2>Input</h2>
          <span className="metabadge">stdin</span>
        </div>
        <textarea
          aria-label="Standard input"
          ref={input}
          onChange={(e) => setBytes(new Blob([e.target.value]).size)}
          defaultValue={initial}
          spellCheck={false}
          placeholder="Enter program input…"
        />
        <div className="iofoot">
          <span>Predefined input</span>
          <span>{bytes} bytes</span>
        </div>
      </section>
    );
  },
);

interface OutputProps {
  output: string;
  detail: string;
  status: Status;
  busy: boolean;
  diagnostics: Diagnostic[];
  metrics: string;
  color: string;
  clear(): void;
  jump(line: number, column: number): void;
}
export function OutputPanel({
  output,
  detail,
  status,
  busy,
  diagnostics,
  metrics,
  color,
  clear,
  jump,
}: OutputProps) {
  const scroll = useRef<HTMLDivElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout>>();
  const [copied, setCopied] = useState("");
  useEffect(() => () => clearTimeout(copyTimer.current), []);
  useEffect(() => {
    if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [output, detail, diagnostics]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(output || detail);
      setCopied("Copied");
    } catch {
      setCopied("Copy unavailable");
    }
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(""), 1700);
  }
  const emptyMessage =
    status === "Ready"
      ? "Run your code to see output here."
      : busy
        ? "Working…"
        : "No output.";
  return (
    <section className="panel iopanel">
      <div className="panelhead">
        <span className="tile blue">
          <Terminal size={18} />
        </span>
        <h2>Output</h2>
        <span className="metabadge">console</span>
        <div className="right push">
          {copied && <small>{copied}</small>}
          <IconButton
            name="Copy output"
            disabled={!output && !detail}
            onClick={copy}
          >
            <Copy />
          </IconButton>
          <IconButton name="Clear output" disabled={busy} onClick={clear}>
            <Trash2 />
          </IconButton>
        </div>
      </div>
      <div className="outputbody" ref={scroll}>
        {output && <pre>{output}</pre>}
        {detail && (
          <div className="detail" role="status">
            {detail}
          </div>
        )}
        {diagnostics.map((d, i) => (
          <button
            className="errorline"
            key={i}
            onClick={() => jump(d.line, d.column)}
          >
            main.cpp:{d.line}:{d.column} · {d.message}
          </button>
        ))}
        {!output && !detail && (
          <div className="empty">
            <Terminal size={18} />
            <span>{emptyMessage}</span>
          </div>
        )}
      </div>
      <div className="iofoot">
        <span className={color}>
          <i className="dot" />
          {status}
        </span>
        <span>{metrics}</span>
      </div>
    </section>
  );
}
