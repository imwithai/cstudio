export type Menu = "Examples" | "Shortcuts" | "Settings" | "Runtime details";

export interface EditorSettings {
  light: boolean;
  fontSize: number;
  minimap: boolean;
  wordWrap: boolean;
}
export interface Diagnostic {
  line: number;
  column: number;
  message: string;
  severity?: "warning" | "error" | "note";
}
export type ActivePhase = "Loading" | "Compiling" | "Running";
export type Status = ActivePhase | "Ready" | "Stopped" | "Success" | "Error";
export type WorkerReply =
  | { type: "status"; status: ActivePhase; detail: string; progress?: number }
  | { type: "output"; stream: "stdout" | "stderr"; text: string }
  | {
      type: "done" | "error";
      exitCode?: number;
      message?: string;
      diagnostics?: string;
      compileMs?: number;
      runMs?: number;
    };

export type Example = { name: string; input: string; code: string };
